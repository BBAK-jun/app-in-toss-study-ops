// Study 컨텍스트 — presentation (Hono). /studies, /studies/:id, /studies/:id/participants,
// /studies/:id/rounds (회차 생성은 Round 컨텍스트 use case 에 위임 — presentation 레벨 오케스트레이션).
import { Hono } from 'hono';
import type { Context } from 'hono';
import { Either, Option, Schema } from 'effect';
import type { AppEnv } from '../../../env';
import type { StudyError } from '../domain/errors';
import { CreateStudyInput, UpdateStudyInput, AddParticipantsInput, StudyIdParam, ParticipantIdParam } from '../application/dto';
import {
  createStudyUC,
  getStudyUC,
  listStudiesUC,
  updateStudyUC,
  addParticipantsUC,
  listParticipantsUC,
  deleteParticipantUC,
} from '../application/use-cases';
import type { Study, Participant } from '../domain/state';
import { Description, WebhookUrl } from '../domain/branded';
import { studyDeps, roundDeps } from '../../deps';
import { createRoundUC } from '../../round/application/use-cases';
import { CreateRoundInput } from '../../round/application/dto';
import { HttpError } from '../../../lib/http-error';

export const studyRoutes = new Hono<AppEnv>();

// Study 도메인 에러 → HTTP. exhaustive switch.
function throwForStudyError(e: StudyError): never {
  switch (e._tag) {
    case 'StudyNotFound':
      throw new HttpError(404, 'NOT_FOUND', `Study ${e.studyId} not found`);
    case 'Forbidden':
      throw new HttpError(403, 'FORBIDDEN', 'You do not own this study');
    case 'ParticipantNotFound':
      throw new HttpError(404, 'NOT_FOUND', `Participant ${e.participantId} not found`);
  }
}

function studyToDto(s: Study) {
  return {
    id: s.id,
    ownerId: s.ownerId,
    title: s.title,
    description: Option.isSome(s.description) ? s.description.value : null,
    discordWebhookUrl: Option.isSome(s.discordWebhookUrl) ? s.discordWebhookUrl.value : null,
    createdAt: s.createdAt,
  };
}

function participantToDto(p: Participant) {
  return {
    id: p.id,
    studyId: p.studyId,
    name: p.name,
    discordHandle: Option.isSome(p.discordHandle) ? p.discordHandle.value : null,
    createdAt: p.createdAt,
  };
}

function decodeStudyId(c: Context<AppEnv>) {
  const p = Schema.decodeUnknownEither(StudyIdParam)({ id: c.req.param('id') });
  if (Either.isLeft(p)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid study id');
  return p.right.id;
}

// ─── 스터디 ──────────────────────────────────────────────────────────────────
studyRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(CreateStudyInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'title is required');
  const study = await createStudyUC(studyDeps(c), {
    title: input.right.title,
    description: input.right.description !== undefined ? Option.some(input.right.description) : Option.none(),
  });
  return c.json(studyToDto(study), 201);
});

studyRoutes.get('/', async (c) => {
  const studies = await listStudiesUC(studyDeps(c));
  return c.json(studies.map(studyToDto), 200);
});

studyRoutes.get('/:id', async (c) => {
  const studyId = decodeStudyId(c);
  const result = await getStudyUC(studyDeps(c), { studyId });
  if (Either.isLeft(result)) throwForStudyError(result.left);
  return c.json(studyToDto(result.right), 200);
});

studyRoutes.patch('/:id', async (c) => {
  const studyId = decodeStudyId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(UpdateStudyInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid body');
  const v = input.right;
  const result = await updateStudyUC(studyDeps(c), {
    studyId,
    changes: {
      ...(v.title !== undefined ? { title: v.title } : {}),
      ...(v.description !== undefined
        ? { description: v.description === null ? Option.none<Description>() : Option.some(v.description) }
        : {}),
      ...(v.discordWebhookUrl !== undefined
        ? { discordWebhookUrl: v.discordWebhookUrl === null ? Option.none<WebhookUrl>() : Option.some(v.discordWebhookUrl) }
        : {}),
    },
  });
  if (Either.isLeft(result)) throwForStudyError(result.left);
  return c.json(studyToDto(result.right), 200);
});

// ─── 참여자 ──────────────────────────────────────────────────────────────────
studyRoutes.post('/:id/participants', async (c) => {
  const studyId = decodeStudyId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(AddParticipantsInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid body');
  const v = input.right;
  const rawItems = v.participants ?? (v.name !== undefined ? [{ name: v.name, discordHandle: v.discordHandle }] : []);
  if (rawItems.length === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'At least one participant with a name is required');
  }
  const result = await addParticipantsUC(
    studyDeps(c),
    {
      studyId,
      items: rawItems.map((it) => ({
        name: it.name,
        discordHandle: it.discordHandle !== undefined ? Option.some(it.discordHandle) : Option.none(),
      })),
    },
  );
  if (Either.isLeft(result)) throwForStudyError(result.left);
  return c.json(result.right.map(participantToDto), 201);
});

studyRoutes.get('/:id/participants', async (c) => {
  const studyId = decodeStudyId(c);
  const result = await listParticipantsUC(studyDeps(c), { studyId });
  if (Either.isLeft(result)) throwForStudyError(result.left);
  return c.json(result.right.map(participantToDto), 200);
});

studyRoutes.delete('/:id/participants/:pid', async (c) => {
  const studyId = decodeStudyId(c);
  const pp = Schema.decodeUnknownEither(ParticipantIdParam)({ pid: c.req.param('pid') });
  if (Either.isLeft(pp)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid participant id');
  const result = await deleteParticipantUC(studyDeps(c), { studyId, participantId: pp.right.pid });
  if (Either.isLeft(result)) throwForStudyError(result.left);
  return c.body(null, 204);
});

// ─── 회차 생성 (Round 컨텍스트 위임) ──────────────────────────────────────────
studyRoutes.post('/:id/rounds', async (c) => {
  const studyId = decodeStudyId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(CreateRoundInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'roundNumber and title are required');

  const result = await createRoundUC(roundDeps(c), {
    studyId,
    number: input.right.roundNumber,
    title: input.right.title,
    dueAt: input.right.dueAt !== undefined ? Option.some(input.right.dueAt) : Option.none(),
  });
  if (Either.isLeft(result)) {
    // createRound 에서 발생 가능한 RoundError 는 Forbidden 뿁.
    throw new HttpError(403, 'FORBIDDEN', 'You do not own this study');
  }
  const r = result.right;
  return c.json(
    {
      id: r.id,
      studyId: r.studyId,
      roundNumber: r.number,
      title: r.title,
      dueAt: Option.isSome(r.dueAt) ? r.dueAt.value : null,
      createdAt: r.createdAt,
      state: r._tag,
      closedAt: null,
    },
    201,
  );
});
