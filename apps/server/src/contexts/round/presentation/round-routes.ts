// Round 컨텍스트 — presentation (Hono).
// handler 는 오직 ① 입력 디코딩(Effect Schema) ② use case 호출 ③ 출력 매핑 만 한다.
import { Hono } from 'hono';
import type { Context } from 'hono';
import { Either, Option, Schema } from 'effect';
import type { AppEnv } from '../../../env';
import type { RoundError } from '../domain/errors';
import { submitToRound, getRoundStatus, getRound, listSubmissions, closeRound } from '../application/use-cases';
import { RoundIdParam, SubmitToRoundInput, ShareDiscordInput } from '../application/dto';
import type { Round } from '../domain/state';
import type { Submission, RoundStatus } from '../domain/aggregate';
import { buildStatusPayload, sendDiscordWebhook } from '../../../discord/webhook';
import { HttpError } from '../../../lib/http-error';
import { roundDeps } from '../../deps';

export const roundRoutes = new Hono<AppEnv>();

// 도메인 에러 ADT → HTTP. exhaustive switch: 새 변종 추가 시 컴파일 에러로 강제 처리.
function throwForError(e: RoundError): never {
  switch (e._tag) {
    case 'RoundNotFound':
      throw new HttpError(404, 'NOT_FOUND', `Round ${e.roundId} not found`);
    case 'RoundNotOpen':
      throw new HttpError(409, 'CONFLICT', 'Round is closed');
    case 'DuplicateSubmission':
      throw new HttpError(409, 'CONFLICT', '이미 제출했습니다');
    case 'ParticipantNotInStudy':
      throw new HttpError(404, 'NOT_FOUND', 'Participant not in study');
    case 'Forbidden':
      throw new HttpError(403, 'FORBIDDEN', 'You do not own this study');
  }
}

// ── DTO 매핑 (Option → null, branded → 원시값 직렬화) ──────────────────────────
function participantDto(p: { id: string; name: string; discordHandle: Option.Option<string> }) {
  return {
    id: p.id,
    name: p.name,
    discordHandle: Option.isSome(p.discordHandle) ? p.discordHandle.value : null,
  };
}

function toSubmissionDto(s: Submission) {
  return {
    id: s.id,
    roundId: s.roundId,
    participantId: s.participantId,
    url: s.url,
    note: Option.isSome(s.note) ? s.note.value : null,
    createdAt: s.createdAt,
  };
}

function toRoundDto(r: Round) {
  return {
    id: r.id,
    studyId: r.studyId,
    roundNumber: r.number,
    title: r.title,
    dueAt: Option.isSome(r.dueAt) ? r.dueAt.value : null,
    createdAt: r.createdAt,
    state: r._tag,
    closedAt: r._tag === 'Closed' ? r.closedAt : null,
  };
}

function toStatusDto(s: RoundStatus) {
  return {
    roundId: s.roundId,
    studyId: s.studyId,
    roundNumber: s.roundNumber,
    title: s.title,
    dueAt: Option.isSome(s.dueAt) ? s.dueAt.value : null,
    state: s.state,
    overdue: s.overdue,
    total: s.total,
    submittedCount: s.submitted.length,
    rate: s.rate,
    submitted: s.submitted.map((x) => ({ participant: participantDto(x.participant), submission: toSubmissionDto(x.submission) })),
    notSubmitted: s.notSubmitted.map(participantDto),
  };
}

function fmtDue(ms: number | null): string {
  if (!ms) return '미정';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatReminder(s: RoundStatus): string {
  const pct = Math.round(s.rate * 100);
  const lines: string[] = [];
  lines.push(`📚 [${s.roundNumber}회차] 제출 리마인드`);
  lines.push(`제출률: ${s.submitted.length}/${s.total} (${pct}%)`);
  lines.push(`마감: ${fmtDue(Option.isSome(s.dueAt) ? s.dueAt.value : null)}`);
  lines.push('');
  if (s.notSubmitted.length > 0) {
    lines.push('아직 제출하지 않은 분:');
    for (const p of s.notSubmitted) {
      const handle =
        Option.isSome(p.discordHandle) && p.discordHandle.value.startsWith('@')
          ? p.discordHandle.value
          : Option.isSome(p.discordHandle)
            ? `@${p.discordHandle.value}`
            : p.name;
      lines.push(`- ${handle}`);
    }
  } else {
    lines.push('🎉 전원 제출 완료!');
  }
  lines.push('');
  lines.push('지금 바로 제출해주세요! 제출 링크는 스레드에서 확인하세요.');
  return lines.join('\n');
}

function decodeRoundId(c: Context<AppEnv>) {
  const params = Schema.decodeUnknownEither(RoundIdParam)({ id: c.req.param('id') });
  if (Either.isLeft(params)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid round id');
  return params.right.id;
}

// ─── 라우트 ──────────────────────────────────────────────────────────────────
roundRoutes.get('/:id', async (c) => {
  const roundId = decodeRoundId(c);
  const result = await getRound(roundDeps(c), { roundId });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json(toRoundDto(result.right), 200);
});

roundRoutes.get('/:id/status', async (c) => {
  const roundId = decodeRoundId(c);
  const result = await getRoundStatus(roundDeps(c), { roundId });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json(toStatusDto(result.right), 200);
});

roundRoutes.get('/:id/submissions', async (c) => {
  const roundId = decodeRoundId(c);
  const result = await listSubmissions(roundDeps(c), { roundId });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json(result.right.map(toSubmissionDto), 200);
});

roundRoutes.post('/:id/submissions', async (c) => {
  const roundId = decodeRoundId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(SubmitToRoundInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid body');

  const result = await submitToRound(roundDeps(c), {
    roundId,
    participantId: input.right.participantId,
    url: input.right.url,
    note: input.right.note !== undefined ? Option.some(input.right.note) : Option.none(),
  });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json(toSubmissionDto(result.right), 201);
});

// 상태 전이: Open → Closed
roundRoutes.post('/:id/close', async (c) => {
  const roundId = decodeRoundId(c);
  const result = await closeRound(roundDeps(c), { roundId });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json(toRoundDto(result.right), 200);
});

roundRoutes.post('/:id/reminder-message', async (c) => {
  const roundId = decodeRoundId(c);
  const result = await getRoundStatus(roundDeps(c), { roundId });
  if (Either.isLeft(result)) throwForError(result.left);
  return c.json({ message: formatReminder(result.right) }, 200);
});

// webhook 후보 우선순위: body > study 기본(ownership.webhookOf) > 전역 기본.
roundRoutes.post('/:id/share-discord', async (c) => {
  const roundId = decodeRoundId(c);
  const body = await c.req.json().catch(() => ({}));
  const input = Schema.decodeUnknownEither(ShareDiscordInput)(body);
  if (Either.isLeft(input)) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid body');

  const d = roundDeps(c);
  const status = await getRoundStatus(d, { roundId }); // 소유권 검증 + 현황 + studyId
  if (Either.isLeft(status)) throwForError(status.left);
  const s = status.right;

  const studyWebhook = await d.ownership.webhookOf(s.studyId);
  const webhookUrl =
    input.right.webhookUrl ??
    (Option.isSome(studyWebhook) ? studyWebhook.value : undefined) ??
    c.env.DISCORD_WEBHOOK_DEFAULT;
  if (!webhookUrl) throw new HttpError(400, 'VALIDATION_ERROR', 'webhookUrl is required');

  const payload = input.right.message
    ? { content: input.right.message }
    : buildStatusPayload({
        roundNumber: s.roundNumber,
        roundTitle: s.title,
        rate: s.rate,
        submittedCount: s.submitted.length,
        total: s.total,
        notSubmittedHandles: s.notSubmitted.map((p) => (Option.isSome(p.discordHandle) ? p.discordHandle.value : p.name)),
        dueAt: Option.isSome(s.dueAt) ? s.dueAt.value : null,
      });

  const result = await sendDiscordWebhook(webhookUrl, payload);
  return c.json({ ok: true, discordResponse: result.discordResponse }, 200);
});
