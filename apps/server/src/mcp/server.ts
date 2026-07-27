import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v3';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { createDb } from '../db/client';
import { studies, rounds, participants, submissions } from '../db/schema';

export class StudyOpsMcpAgent extends McpAgent {
  server = new McpServer({
    name: 'studyops-mcp',
    version: '1.0.0',
  });

  async init() {
    const db = createDb(this.env.DB);

    this.server.tool(
      'list_studies',
      'List all studies across the system (operator/admin view). Returns every study with id, title, ownerId, description, and createdAt.',
      {},
      async () => {
        const rows = await db.select().from(studies).orderBy(desc(studies.createdAt)).all();
        const data = rows.map((r) => ({
          id: r.id,
          title: r.title,
          ownerId: r.ownerId,
          description: r.description,
          createdAt: r.createdAt,
          createdAtIso: new Date(r.createdAt).toISOString(),
        }));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    );

    this.server.tool(
      'get_study',
      'Get detailed information about a single study, including participant count and round count.',
      {
        studyId: z.string().uuid().describe('The study ID'),
      },
      async ({ studyId }) => {
        const study = await db.select().from(studies).where(eq(studies.id, studyId)).get();
        if (!study) {
          return {
            content: [{ type: 'text' as const, text: `Study ${studyId} not found` }],
            isError: true,
          };
        }
        const [participantCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(participants)
          .where(eq(participants.studyId, studyId))
          .all();
        const [roundCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(rounds)
          .where(eq(rounds.studyId, studyId))
          .all();

        const data = {
          id: study.id,
          title: study.title,
          ownerId: study.ownerId,
          description: study.description,
          discordWebhookUrl: study.discordWebhookUrl,
          createdAt: study.createdAt,
          createdAtIso: new Date(study.createdAt).toISOString(),
          participantCount: participantCount?.count ?? 0,
          roundCount: roundCount?.count ?? 0,
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    );

    this.server.tool(
      'list_rounds',
      'List all rounds in a study, ordered by round number ascending.',
      {
        studyId: z.string().uuid().describe('The study ID'),
      },
      async ({ studyId }) => {
        const study = await db.select().from(studies).where(eq(studies.id, studyId)).get();
        if (!study) {
          return {
            content: [{ type: 'text' as const, text: `Study ${studyId} not found` }],
            isError: true,
          };
        }
        const rows = await db
          .select()
          .from(rounds)
          .where(eq(rounds.studyId, studyId))
          .orderBy(asc(rounds.roundNumber))
          .all();
        const data = rows.map((r) => ({
          id: r.id,
          roundNumber: r.roundNumber,
          title: r.title,
          dueAt: r.dueAt,
          dueAtIso: r.dueAt ? new Date(r.dueAt).toISOString() : null,
          createdAt: r.createdAt,
        }));
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    );

    this.server.tool(
      'get_round_status',
      'Get submission status for a specific round: total participants, submitted count, submission rate, and lists of submitted/not-submitted participants.',
      {
        roundId: z.string().uuid().describe('The round ID'),
      },
      async ({ roundId }) => {
        const round = await db.select().from(rounds).where(eq(rounds.id, roundId)).get();
        if (!round) {
          return {
            content: [{ type: 'text' as const, text: `Round ${roundId} not found` }],
            isError: true,
          };
        }
        const allParticipants = await db
          .select()
          .from(participants)
          .where(eq(participants.studyId, round.studyId))
          .all();
        const subs = await db
          .select()
          .from(submissions)
          .where(eq(submissions.roundId, roundId))
          .all();

        const submittedIds = new Set(subs.map((s) => s.participantId));
        const submitted = allParticipants
          .filter((p) => submittedIds.has(p.id))
          .map((p) => {
            const sub = subs.find((s) => s.participantId === p.id)!;
            return {
              name: p.name,
              discordHandle: p.discordHandle,
              url: sub.url,
              submittedAt: new Date(sub.createdAt).toISOString(),
            };
          });
        const notSubmitted = allParticipants
          .filter((p) => !submittedIds.has(p.id))
          .map((p) => ({ name: p.name, discordHandle: p.discordHandle }));

        const total = allParticipants.length;
        const submittedCount = submitted.length;
        const rate = total > 0 ? submittedCount / total : 0;

        const data = {
          roundId: round.id,
          roundNumber: round.roundNumber,
          title: round.title,
          dueAt: round.dueAt,
          dueAtIso: round.dueAt ? new Date(round.dueAt).toISOString() : null,
          total,
          submittedCount,
          rate: Math.round(rate * 100) / 100,
          ratePercent: Math.round(rate * 100),
          submitted,
          notSubmitted,
        };
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
        };
      },
    );

    this.server.tool(
      'list_low_submission_rounds',
      'Operator dashboard: find rounds with low submission rates across all studies. Returns rounds where submission rate is at or below a threshold (default 50%), sorted by lowest rate first. Set maxRate=1.0 to list all rounds with their rates.',
      {
        maxRate: z
          .number()
          .min(0)
          .max(1)
          .default(0.5)
          .describe('Maximum submission rate threshold (0-1). Default 0.5 (50%).'),
      },
      async ({ maxRate }) => {
        const allRounds = await db.select().from(rounds).orderBy(desc(rounds.createdAt)).all();
        const allStudies = await db.select().from(studies).all();
        const studyMap = new Map(allStudies.map((s) => [s.id, s.title]));

        const results: Array<Record<string, unknown>> = [];

        for (const round of allRounds) {
          const allParticipants = await db
            .select()
            .from(participants)
            .where(eq(participants.studyId, round.studyId))
            .all();
          const subs = await db
            .select()
            .from(submissions)
            .where(eq(submissions.roundId, round.id))
            .all();

          const total = allParticipants.length;
          const submittedCount = subs.length;
          const rate = total > 0 ? submittedCount / total : 0;

          if (rate <= maxRate) {
            results.push({
              roundId: round.id,
              roundNumber: round.roundNumber,
              title: round.title,
              studyId: round.studyId,
              studyTitle: studyMap.get(round.studyId) ?? 'Unknown',
              total,
              submittedCount,
              rate: Math.round(rate * 100) / 100,
              ratePercent: Math.round(rate * 100),
              dueAt: round.dueAt,
              dueAtIso: round.dueAt ? new Date(round.dueAt).toISOString() : null,
            });
          }
        }

        results.sort((a, b) => (a.rate as number) - (b.rate as number));

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
        };
      },
    );
  }
}
