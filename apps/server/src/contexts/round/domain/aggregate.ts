import { Either, Option } from 'effect';
import type { OpenRound, ClosedRound, Round } from './state';
import type { RoundEvent } from './events';
import { RoundErrors } from './errors';
import type { RoundError } from './errors';
import type {
  RoundId,
  StudyId,
  ParticipantId,
  SubmissionId,
  RoundNumber,
  RoundTitle,
  EpochMs,
  Url,
} from './branded';

// 도메인은 시간/ID를 직접 읽지 않는다 — 명시적으로 주입받는다 (Date.now/randomUUID 금지).
export interface RoundClock {
  readonly now: () => EpochMs;
}
export interface RoundIds {
  readonly roundId: () => RoundId;
  readonly submissionId: () => SubmissionId;
}

// 자식 엔티티: 제출 (Round 애그리거트 루트 아래)
export interface Submission {
  readonly id: SubmissionId;
  readonly roundId: RoundId;
  readonly participantId: ParticipantId;
  readonly url: Url;
  readonly note: Option.Option<string>;
  readonly createdAt: EpochMs;
}

export interface ParticipantInfo {
  readonly id: ParticipantId;
  readonly name: string;
  readonly discordHandle: Option.Option<string>;
}

// ── 팩토리: OpenRound 생성. title 은 branded(빈 문자열 불가) → 실패 불가, Either 불필요. ──
export function openRound(args: {
  ids: RoundIds;
  clock: RoundClock;
  studyId: StudyId;
  number: RoundNumber;
  title: RoundTitle;
  dueAt: Option.Option<EpochMs>;
}): { readonly round: OpenRound; readonly events: readonly RoundEvent[] } {
  const id = args.ids.roundId();
  const at = args.clock.now();
  const round: OpenRound = {
    _tag: 'Open',
    id,
    studyId: args.studyId,
    number: args.number,
    title: args.title,
    dueAt: args.dueAt,
    createdAt: at,
  };
  return { round, events: [{ type: 'RoundOpened', roundId: id, studyId: args.studyId, at }] };
}

// ── 전이: Open → Closed. 인자를 변경하지 않고 '새 값'을 반환한다 (불변). ──
export function close(round: OpenRound, clock: RoundClock): {
  readonly round: ClosedRound;
  readonly events: readonly RoundEvent[];
} {
  const at = clock.now();
  return {
    round: { ...round, _tag: 'Closed', closedAt: at },
    events: [{ type: 'RoundClosed', roundId: round.id, at }],
  };
}

// ── 제출 결정: 상태/소속/유일성 불변식을 검사. IO 없음(순수). ──
export function submit(args: {
  round: Round;
  participantId: ParticipantId;
  participantBelongsToStudy: boolean; // 애플리케이션이 미리 조회한 '사실'
  url: Url;
  note: Option.Option<string>;
  existing: ReadonlyArray<Submission>; // 같은 회차의 기존 제출 (유일성 검사용)
  ids: RoundIds;
  clock: RoundClock;
}): Either.Either<Submission, RoundError> {
  const { round, participantId } = args;

  // 1) 상태 가드: Closed 면 제출 불가. 가드 통과 후 round 는 OpenRound 로 좁혀진다.
  if (round._tag !== 'Open') {
    return Either.left(RoundErrors.notOpen(round.id));
  }
  // 2) 참여자 소속 가드
  if (!args.participantBelongsToStudy) {
    return Either.left(RoundErrors.notInStudy(participantId, round.studyId));
  }
  // 3) 유일성 불변식: UNIQUE(roundId, participantId) 를 도메인이 먼저 판단
  if (args.existing.some((s) => s.participantId === participantId)) {
    return Either.left(RoundErrors.duplicate(round.id, participantId));
  }

  const id = args.ids.submissionId();
  const at = args.clock.now();
  return Either.right({
    id,
    roundId: round.id,
    participantId,
    url: args.url,
    note: args.note,
    createdAt: at,
  });
}

// ── 투영(조회): overdue 는 '저장 상태'가 아니라 (상태, 현재시각)의 순수 함수. ──
// 저장하면 시간이 지나도 갱신이 안 되어 stale 해지므로, 매 조회마다 계산한다.
export interface RoundStatus {
  readonly roundId: RoundId;
  readonly studyId: StudyId;
  readonly roundNumber: RoundNumber;
  readonly title: RoundTitle;
  readonly dueAt: Option.Option<EpochMs>;
  readonly state: 'Open' | 'Closed';
  readonly overdue: boolean;
  readonly total: number;
  readonly rate: number; // 0..1
  readonly submitted: ReadonlyArray<{ readonly participant: ParticipantInfo; readonly submission: Submission }>;
  readonly notSubmitted: ReadonlyArray<ParticipantInfo>;
}

export function projectStatus(args: {
  round: Round;
  participants: ReadonlyArray<ParticipantInfo>;
  submissions: ReadonlyArray<Submission>;
  clock: RoundClock;
}): RoundStatus {
  const byId = new Map(args.participants.map((p) => [p.id as string, p]));
  const submitted = args.submissions
    .map((s) => ({ participant: byId.get(s.participantId as string), submission: s }))
    .filter((x): x is { participant: ParticipantInfo; submission: Submission } => x.participant !== undefined);

  const submittedIds = new Set(args.submissions.map((s) => s.participantId as string));
  const notSubmitted = args.participants.filter((p) => !submittedIds.has(p.id as string));

  const total = args.participants.length;
  const now = args.clock.now();
  const due = args.round.dueAt;

  return {
    roundId: args.round.id,
    studyId: args.round.studyId,
    roundNumber: args.round.number,
    title: args.round.title,
    dueAt: args.round.dueAt,
    state: args.round._tag,
    overdue: args.round._tag === 'Open' && Option.isSome(due) && now > due.value,
    total,
    rate: total > 0 ? submitted.length / total : 0,
    submitted,
    notSubmitted,
  };
}
