// 회차 라우트 — /rounds/* (protectedApi 에 /rounds 로 마운트).
// GET /:id, POST/GET /:id/submissions, GET /:id/status, POST /:id/reminder-message, POST /:id/share-discord
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import { createDb, type Database } from '../db/client';
import { studies, rounds, participants, submissions } from '../db/schema';
import { buildStatusPayload, sendDiscordWebhook } from '../discord/webhook';
import type {
  RoundDto,
  RoundStatusDto,
  SubmittedEntry,
  SubmissionDto,
  SubmissionCreateInput,
  ParticipantDto,
  ShareDiscordRequest,
  ShareDiscordResponse,
} from '@studyops/shared';

export const roundRoutes = new Hono<AppEnv>();

// ─── mappers ───────────────────────────────────────────────────────────────
function toRoundDto(row: typeof rounds.$inferSelect): RoundDto {
  return {
    id: row.id,
    studyId: row.studyId,
    roundNumber: row.roundNumber,
    title: row.title,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
  };
}

function toParticipantDto(row: typeof participants.$inferSelect): ParticipantDto {
  return {
    id: row.id,
    studyId: row.studyId,
    name: row.name,
    discordHandle: row.discordHandle,
    createdAt: row.createdAt,
  };
}

function toSubmissionDto(row: typeof submissions.$inferSelect): SubmissionDto {
  return {
    id: row.id,
    roundId: row.roundId,
    participantId: row.participantId,
    url: row.url,
    note: row.note,
    createdAt: row.createdAt,
  };
}

// ─── 회차 + 소유권 로드 ────────────────────────────────────────────────────
async function loadOwnedRound(
  db: Database,
  roundId: string,
  userKey: number,
): Promise<{ round: typeof rounds.$inferSelect; study: typeof studies.$inferSelect }> {
  const round = await db.select().from(rounds).where(eq(rounds.id, roundId)).get();
  if (!round) {
    throw new HttpError(404, 'NOT_FOUND', `Round ${roundId} not found`);
  }
  const study = await db.select().from(studies).where(eq(studies.id, round.studyId)).get();
  if (!study) {
    throw new HttpError(404, 'NOT_FOUND', `Study for round ${roundId} not found`);
  }
  if (study.ownerId !== userKey) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not own this study');
  }
  return { round, study };
}

// ─── 현황 계산 (status/reminder/share 공용) ────────────────────────────────
async function computeRoundStatus(
  db: Database,
  round: typeof rounds.$inferSelect,
): Promise<RoundStatusDto> {
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

  const submittedIds = new Set(subs.map((s) => s.participantId));
  const submitted: SubmittedEntry[] = allParticipants
    .filter((p) => submittedIds.has(p.id))
    .map((p) => {
      const sub = subs.find((s) => s.participantId === p.id)!;
      return { participant: toParticipantDto(p), submission: toSubmissionDto(sub) };
    });
  const notSubmitted: ParticipantDto[] = allParticipants
    .filter((p) => !submittedIds.has(p.id))
    .map(toParticipantDto);

  const total = allParticipants.length;
  const rate = total > 0 ? submitted.length / total : 0;

  return {
    roundId: round.id,
    roundNumber: round.roundNumber,
    title: round.title,
    dueAt: round.dueAt,
    total,
    submitted,
    notSubmitted,
    rate,
  };
}

function fmtDue(ms: number | null): string {
  if (!ms) return '미정';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── GET /rounds/:id ──────────────────────────────────────────────────────
roundRoutes.get('/:id', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const { round } = await loadOwnedRound(db, c.req.param('id'), userKey);
  return c.json(toRoundDto(round), 200);
});

// ─── POST /rounds/:id/submissions ─────────────────────────────────────────
roundRoutes.post('/:id/submissions', async (c) => {
  const { userKey } = c.get('user');
  const body = (await c.req.json().catch(() => null)) as Partial<SubmissionCreateInput> | null;
  if (!body || typeof body.participantId !== 'string' || typeof body.url !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'participantId and url are required');
  }
  const db = createDb(c.env.DB);
  const { round } = await loadOwnedRound(db, c.req.param('id'), userKey);

  // 참여자가 이 스터디에 속하는지 검증
  const participant = await db
    .select()
    .from(participants)
    .where(eq(participants.id, body.participantId))
    .get();
  if (!participant || participant.studyId !== round.studyId) {
    throw new HttpError(404, 'NOT_FOUND', `Participant ${body.participantId} not in this study`);
  }

  // UNIQUE(roundId, participantId) 사전 체크 → 409
  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.roundId, round.id))
    .all();
  if (existing.some((s) => s.participantId === body.participantId)) {
    throw new HttpError(409, 'CONFLICT', '이미 제출했습니다');
  }

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    roundId: round.id,
    participantId: body.participantId,
    url: body.url,
    note: body.note ?? null,
    createdAt: now,
  };
  await db.insert(submissions).values(row);
  return c.json(toSubmissionDto(row), 201);
});

// ─── GET /rounds/:id/submissions ──────────────────────────────────────────
roundRoutes.get('/:id/submissions', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const { round } = await loadOwnedRound(db, c.req.param('id'), userKey);
  const rows = await db
    .select()
    .from(submissions)
    .where(eq(submissions.roundId, round.id))
    .all();
  return c.json(rows.map(toSubmissionDto), 200);
});

// ─── GET /rounds/:id/status (MVP 핵심) ─────────────────────────────────────
roundRoutes.get('/:id/status', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const { round } = await loadOwnedRound(db, c.req.param('id'), userKey);
  const status = await computeRoundStatus(db, round);
  return c.json(status, 200);
});

// ─── POST /rounds/:id/reminder-message ─────────────────────────────────────
roundRoutes.post('/:id/reminder-message', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const { round } = await loadOwnedRound(db, c.req.param('id'), userKey);
  const status = await computeRoundStatus(db, round);

  const pct = Math.round(status.rate * 100);
  const lines: string[] = [];
  lines.push(`📚 [${status.roundNumber}회차] 제출 리마인드`);
  lines.push(`제출률: ${status.submitted.length}/${status.total} (${pct}%)`);
  lines.push(`마감: ${fmtDue(status.dueAt)}`);
  lines.push('');
  if (status.notSubmitted.length > 0) {
    lines.push('아직 제출하지 않은 분:');
    for (const p of status.notSubmitted) {
      const handle = p.discordHandle ? (p.discordHandle.startsWith('@') ? p.discordHandle : `@${p.discordHandle}`) : p.name;
      lines.push(`- ${handle}`);
    }
  } else {
    lines.push('🎉 전원 제출 완료!');
  }
  lines.push('');
  lines.push('지금 바로 제출해주세요! 제출 링크는 스레드에서 확인하세요.');

  return c.json({ message: lines.join('\n') }, 200);
});

// ─── POST /rounds/:id/share-discord ────────────────────────────────────────
roundRoutes.post('/:id/share-discord', async (c) => {
  const { userKey } = c.get('user');
  const body = (await c.req.json().catch(() => ({}))) as ShareDiscordRequest;
  const db = createDb(c.env.DB);
  const { round, study } = await loadOwnedRound(db, c.req.param('id'), userKey);

  const webhookUrl =
    body.webhookUrl ?? study.discordWebhookUrl ?? c.env.DISCORD_WEBHOOK_DEFAULT;
  if (!webhookUrl) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'webhookUrl is required (no study or default webhook configured)',
    );
  }

  let payload;
  if (body.message) {
    payload = { content: body.message };
  } else {
    const status = await computeRoundStatus(db, round);
    const notSubmittedHandles = status.notSubmitted.map((p) =>
      p.discordHandle ? p.discordHandle : p.name,
    );
    payload = buildStatusPayload({
      roundNumber: status.roundNumber,
      roundTitle: status.title,
      rate: status.rate,
      submittedCount: status.submitted.length,
      total: status.total,
      notSubmittedHandles,
      dueAt: status.dueAt,
    });
  }

  const result = await sendDiscordWebhook(webhookUrl, payload);
  const res: ShareDiscordResponse = { ok: true, discordResponse: result.discordResponse };
  return c.json(res, 200);
});
