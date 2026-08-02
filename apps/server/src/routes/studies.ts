// 스터디 라우트 — /studies/* (protectedApi 에 /studies 로 마운트).
// POST/GET/LIST/PATCH /studies, /studies/:id/participants, /studies/:id/rounds
import { Hono } from 'hono';
import { eq, inArray } from 'drizzle-orm';
import type { AppEnv } from '../env';
import { HttpError } from '../lib/http-error';
import { createDb } from '../db/client';
import { studies, rounds, participants, submissions } from '../db/schema';
import { computeSubmissionRate } from '@studyops/shared';
import { assertStudyOwner } from '../lib/authorization';
import { toStudyDto, toRoundDto, toParticipantDto } from './mappers';
import type {
  StudyCreateInput,
  StudyUpdateInput,
  ParticipantCreateInput,
  RoundCreateInput,
} from '@studyops/shared';

export const studyRoutes = new Hono<AppEnv>();

// ─── 소유권 검증 헬퍼 ───────────────────────────────────────────────────────
async function getOwnedStudy(
  db: ReturnType<typeof createDb>,
  id: string,
  userKey: number,
): Promise<typeof studies.$inferSelect> {
  const row = await db.select().from(studies).where(eq(studies.id, id)).get();
  if (!row) {
    throw new HttpError(404, 'NOT_FOUND', `Study ${id} not found`);
  }
  assertStudyOwner(row.ownerId, userKey);
  return row;
}

// ─── POST /studies ────────────────────────────────────────────────────────
studyRoutes.post('/', async (c) => {
  const { userKey } = c.get('user');
  const body = (await c.req.json().catch(() => null)) as Partial<StudyCreateInput> | null;
  if (!body || typeof body.title !== 'string' || body.title.trim() === '') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'title is required');
  }
  const db = createDb(c.env.DB);
  const now = Date.now();
  const id = crypto.randomUUID();
  const row = {
    id,
    ownerId: userKey,
    title: body.title.trim(),
    description: body.description ?? null,
    discordWebhookUrl: null,
    createdAt: now,
  };
  await db.insert(studies).values(row);
  return c.json(toStudyDto({ ...row, description: row.description, discordWebhookUrl: null }), 201);
});

// ─── GET /studies ─────────────────────────────────────────────────────────
studyRoutes.get('/', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const rows = await db.select().from(studies).where(eq(studies.ownerId, userKey)).all();
  return c.json(rows.map(toStudyDto), 200);
});

// ─── GET /studies/:id ─────────────────────────────────────────────────────
studyRoutes.get('/:id', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const study = await getOwnedStudy(db, c.req.param('id'), userKey);
  return c.json(toStudyDto(study), 200);
});

// ─── PATCH /studies/:id ───────────────────────────────────────────────────
studyRoutes.patch('/:id', async (c) => {
  const { userKey } = c.get('user');
  const body = (await c.req.json().catch(() => null)) as Partial<StudyUpdateInput> | null;
  if (!body) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body is required');
  }
  const db = createDb(c.env.DB);
  const study = await getOwnedStudy(db, c.req.param('id'), userKey);

  const set: Partial<typeof studies.$inferSelect> = {};
  if (typeof body.title === 'string') set.title = body.title;
  if (body.description !== undefined) set.description = body.description;
  if (body.discordWebhookUrl !== undefined) set.discordWebhookUrl = body.discordWebhookUrl;

  if (Object.keys(set).length === 0) {
    return c.json(toStudyDto(study), 200);
  }

  const updated = await db.update(studies).set(set).where(eq(studies.id, study.id)).returning().get();
  return c.json(toStudyDto(updated), 200);
});

// ─── POST /studies/:id/participants (복수 등록 지원) ──────────────────────
studyRoutes.post('/:id/participants', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  const study = await getOwnedStudy(db, c.req.param('id'), userKey);

  const raw = (await c.req.json().catch(() => null)) as
    | (ParticipantCreateInput & { participants?: undefined })
    | { participants: ParticipantCreateInput[] }
    | null;
  if (!raw) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  const list: ParticipantCreateInput[] =
    'participants' in raw && Array.isArray(raw.participants)
      ? raw.participants
      : [raw as ParticipantCreateInput];

  const valid = list.filter(
    (p) => p && typeof p.name === 'string' && p.name.trim() !== '',
  );
  if (valid.length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'At least one participant with a name is required');
  }

  const now = Date.now();
  const rows = valid.map((p) => ({
    id: crypto.randomUUID(),
    studyId: study.id,
    name: p.name.trim(),
    discordHandle: p.discordHandle ?? null,
    createdAt: now,
  }));
  await db.insert(participants).values(rows);
  return c.json(rows.map(toParticipantDto), 201);
});

// ─── GET /studies/:id/participants ────────────────────────────────────────
studyRoutes.get('/:id/participants', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  await getOwnedStudy(db, c.req.param('id'), userKey);
  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.studyId, c.req.param('id')))
    .all();
  return c.json(rows.map(toParticipantDto), 200);
});

// ─── DELETE /studies/:id/participants/:pid ────────────────────────────────
studyRoutes.delete('/:id/participants/:pid', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  await getOwnedStudy(db, c.req.param('id'), userKey);
  await db.delete(participants).where(eq(participants.id, c.req.param('pid')));
  return c.body(null, 204);
});

// ─── POST /studies/:id/rounds ─────────────────────────────────────────────
studyRoutes.post('/:id/rounds', async (c) => {
  const { userKey } = c.get('user');
  const body = (await c.req.json().catch(() => null)) as Partial<RoundCreateInput> | null;
  if (!body || typeof body.roundNumber !== 'number' || typeof body.title !== 'string') {
    throw new HttpError(400, 'VALIDATION_ERROR', 'roundNumber and title are required');
  }
  const db = createDb(c.env.DB);
  const study = await getOwnedStudy(db, c.req.param('id'), userKey);

  const now = Date.now();
  const row = {
    id: crypto.randomUUID(),
    studyId: study.id,
    roundNumber: body.roundNumber,
    title: body.title,
    dueAt: body.dueAt ?? null,
    createdAt: now,
  };
  await db.insert(rounds).values(row);
  return c.json(toRoundDto(row), 201);
});

// ─── GET /studies/:id/rounds ──────────────────────────────────────────────
studyRoutes.get('/:id/rounds', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  await getOwnedStudy(db, c.req.param('id'), userKey);
  const rows = await db
    .select()
    .from(rounds)
    .where(eq(rounds.studyId, c.req.param('id')))
    .all();
  return c.json(rows.map(toRoundDto), 200);
});

// ─── GET /studies/:id/rounds/status — 회차별 제출률 배치 조회 ──────────────
studyRoutes.get('/:id/rounds/status', async (c) => {
  const { userKey } = c.get('user');
  const db = createDb(c.env.DB);
  await getOwnedStudy(db, c.req.param('id'), userKey);

  const allRounds = await db.select().from(rounds).where(eq(rounds.studyId, c.req.param('id'))).all();
  const totalParticipants = await db.select().from(participants).where(eq(participants.studyId, c.req.param('id'))).all();
  const total = totalParticipants.length;

  const roundIds = allRounds.map((r) => r.id);
  const allSubs = roundIds.length > 0
    ? await db.select().from(submissions).where(inArray(submissions.roundId, roundIds)).all()
    : [];

  const countByRound = new Map<string, number>();
  for (const s of allSubs) {
    countByRound.set(s.roundId, (countByRound.get(s.roundId) ?? 0) + 1);
  }

  return c.json(allRounds.map((r) => ({
    roundId: r.id,
    roundNumber: r.roundNumber,
    title: r.title,
    dueAt: r.dueAt,
    submittedCount: countByRound.get(r.id) ?? 0,
    total,
    rate: computeSubmissionRate(countByRound.get(r.id) ?? 0, total),
  })), 200);
});
