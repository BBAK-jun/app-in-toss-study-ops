import { Either, Option } from 'effect';
import { submit, projectStatus, close, openRound } from '../domain/aggregate';
import type { Submission, RoundStatus } from '../domain/aggregate';
import type { Round, ClosedRound, OpenRound } from '../domain/state';
import { RoundErrors } from '../domain/errors';
import type { RoundError } from '../domain/errors';
import type { Clock, IdGenerator, UnitOfWork, StudyOwnershipService, Principal } from './ports';
import type { RoundId, ParticipantId, Url, StudyId, RoundNumber, RoundTitle, EpochMs } from '../domain/branded';

export interface RoundDeps {
  uow: UnitOfWork;
  ownership: StudyOwnershipService;
  ids: IdGenerator;
  clock: Clock;
  principal: Principal;
}

// 공통: 회차 로드 + 소유권 검증. 실패는 Either 로.
async function loadOwned(
  deps: RoundDeps,
  tx: UnitOfWork,
  roundId: RoundId,
): Promise<Either.Either<{ round: Round; submissions: ReadonlyArray<Submission> }, RoundError>> {
  const agg = await tx.rounds.findById(roundId);
  if (Option.isNone(agg)) return Either.left(RoundErrors.notFound(roundId));
  const { round, submissions } = agg.value;
  const owner = await deps.ownership.isOwner(round.studyId, deps.principal.userKey);
  if (!owner) return Either.left(RoundErrors.forbidden(deps.principal.userKey, round.studyId));
  return Either.right({ round, submissions });
}

// ── 회차 생성: 소유권 검증 후 openRound 팩토리로 OpenRound 생성 + INSERT. ──
export async function createRoundUC(
  deps: RoundDeps,
  input: { studyId: StudyId; number: RoundNumber; title: RoundTitle; dueAt: Option.Option<EpochMs> },
): Promise<Either.Either<OpenRound, RoundError>> {
  return deps.uow.run(async (tx) => {
    const owner = await deps.ownership.isOwner(input.studyId, deps.principal.userKey);
    if (!owner) return Either.left(RoundErrors.forbidden(deps.principal.userKey, input.studyId));

    const { round, events } = openRound({
      ids: deps.ids,
      clock: deps.clock,
      studyId: input.studyId,
      number: input.number,
      title: input.title,
      dueAt: input.dueAt,
    });
    await tx.rounds.create(round);
    void events;
    return Either.right(round);
  });
}

// ── 제출: 트랜잭션 안에서 조회→소유권→결정→영속화를 조립. ──
export async function submitToRound(
  deps: RoundDeps,
  input: { roundId: RoundId; participantId: ParticipantId; url: Url; note: Option.Option<string> },
): Promise<Either.Either<Submission, RoundError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.roundId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    const { round, submissions } = loaded.right;

    const belongs = await deps.ownership.participantBelongsToStudy(input.participantId, round.studyId);
    const decision = submit({
      round,
      participantId: input.participantId,
      participantBelongsToStudy: belongs,
      url: input.url,
      note: input.note,
      existing: submissions,
      ids: deps.ids,
      clock: deps.clock,
    });
    if (Either.isLeft(decision)) return Either.left(decision.left);

    await tx.rounds.addSubmission(decision.right);
    return Either.right(decision.right);
  });
}

// ── 현황 조회 ──
export async function getRoundStatus(
  deps: RoundDeps,
  input: { roundId: RoundId },
): Promise<Either.Either<RoundStatus, RoundError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.roundId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    const participants = await deps.ownership.participantsOf(loaded.right.round.studyId);
    return Either.right(
      projectStatus({
        round: loaded.right.round,
        participants,
        submissions: loaded.right.submissions,
        clock: deps.clock,
      }),
    );
  });
}

// ── 단건 조회 ──
export async function getRound(
  deps: RoundDeps,
  input: { roundId: RoundId },
): Promise<Either.Either<Round, RoundError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.roundId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    return Either.right(loaded.right.round);
  });
}

// ── 제출 목록 ──
export async function listSubmissions(
  deps: RoundDeps,
  input: { roundId: RoundId },
): Promise<Either.Either<ReadonlyArray<Submission>, RoundError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.roundId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    return Either.right(loaded.right.submissions);
  });
}

// ── 종료(상태 전이 Open→Closed) ──
export async function closeRound(
  deps: RoundDeps,
  input: { roundId: RoundId },
): Promise<Either.Either<ClosedRound, RoundError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.roundId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    const { round } = loaded.right;
    if (round._tag !== 'Open') return Either.left(RoundErrors.notOpen(round.id));

    const { round: closed, events } = close(round, deps.clock);
    await tx.rounds.save(closed);
    // 이벤트 발행은 애플리케이션 책임 — 현재 사용처(outbox/handler)가 없으므로 표시만.
    void events;
    return Either.right(closed);
  });
}
