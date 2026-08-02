import { Either, Option } from 'effect';
import { createStudy, applyStudyUpdate, createParticipant } from '../domain/aggregate';
import type { StudyIds, StudyChanges } from '../domain/aggregate';
import type { Study, Participant } from '../domain/state';
import { StudyErrors } from '../domain/errors';
import type { StudyError } from '../domain/errors';
import type { StudyUnitOfWork } from './ports';
import type { Clock, Principal } from '../../shared/application/ports';
import type { StudyId, ParticipantId, StudyTitle, Description } from '../domain/branded';

export interface StudyDeps {
  uow: StudyUnitOfWork;
  ids: StudyIds;
  clock: Clock;
  principal: Principal;
}

// 공통: 스터디 로드 + 소유권 검증(ownerId === userKey). 권한의 단일 출처.
async function loadOwned(
  deps: StudyDeps,
  tx: StudyUnitOfWork,
  studyId: StudyId,
): Promise<Either.Either<Study, StudyError>> {
  const s = await tx.studies.findById(studyId);
  if (Option.isNone(s)) return Either.left(StudyErrors.notFound(studyId));
  if (s.value.ownerId !== deps.principal.userKey) {
    return Either.left(StudyErrors.forbidden(deps.principal.userKey, studyId));
  }
  return Either.right(s.value);
}

// ── 스터디 생성 (owner = principal) ──
export async function createStudyUC(
  deps: StudyDeps,
  input: { title: StudyTitle; description: Option.Option<Description> },
): Promise<Study> {
  const { study, events } = createStudy({
    ids: deps.ids,
    clock: deps.clock,
    ownerId: deps.principal.userKey,
    title: input.title,
    description: input.description,
  });
  await deps.uow.run(async (tx) => {
    await tx.studies.save(study);
    void events;
  });
  return study;
}

export async function getStudyUC(deps: StudyDeps, input: { studyId: StudyId }): Promise<Either.Either<Study, StudyError>> {
  return deps.uow.run(async (tx) => loadOwned(deps, tx, input.studyId));
}

export async function listStudiesUC(deps: StudyDeps): Promise<ReadonlyArray<Study>> {
  return deps.uow.run(async (tx) => tx.studies.findByOwner(deps.principal.userKey));
}

export async function updateStudyUC(
  deps: StudyDeps,
  input: { studyId: StudyId; changes: StudyChanges },
): Promise<Either.Either<Study, StudyError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.studyId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    const updated = applyStudyUpdate(loaded.right, input.changes);
    await tx.studies.save(updated);
    return Either.right(updated);
  });
}

export async function addParticipantsUC(
  deps: StudyDeps,
  input: {
    studyId: StudyId;
    items: ReadonlyArray<{ name: string; discordHandle: Option.Option<string> }>;
  },
): Promise<Either.Either<ReadonlyArray<Participant>, StudyError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.studyId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    if (input.items.length === 0) return Either.right([]);
    const created = input.items.map((item) =>
      createParticipant({
        ids: deps.ids,
        clock: deps.clock,
        studyId: input.studyId,
        name: item.name,
        discordHandle: item.discordHandle,
      }).participant,
    );
    await tx.participants.addMany(created);
    return Either.right(created);
  });
}

export async function listParticipantsUC(
  deps: StudyDeps,
  input: { studyId: StudyId },
): Promise<Either.Either<ReadonlyArray<Participant>, StudyError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.studyId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    return Either.right(await tx.participants.findByStudy(input.studyId));
  });
}

export async function deleteParticipantUC(
  deps: StudyDeps,
  input: { studyId: StudyId; participantId: ParticipantId },
): Promise<Either.Either<void, StudyError>> {
  return deps.uow.run(async (tx) => {
    const loaded = await loadOwned(deps, tx, input.studyId);
    if (Either.isLeft(loaded)) return Either.left(loaded.left);
    await tx.participants.deleteById(input.participantId);
    return Either.right(undefined);
  });
}
