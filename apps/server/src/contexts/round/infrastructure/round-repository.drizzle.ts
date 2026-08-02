import { eq } from 'drizzle-orm';
import { Option, Schema } from 'effect';
import { createDb } from '../../../db/client';
import { rounds as t, submissions as ts } from '../../../db/schema';
import {
  RoundId,
  StudyId,
  RoundNumber,
  RoundTitle,
  EpochMs,
  SubmissionId,
  ParticipantId,
  Url,
} from '../domain/branded';
import type { Round, OpenRound, ClosedRound } from '../domain/state';
import type { Submission } from '../domain/aggregate';
import type { RoundRepository, RoundAggregate } from '../domain/repository';

// ── 매퍼: persistence row(스키마) ≠ domain model. 경계에서만 변환. ──
// 컬럼명/타입이 바뀌어도 도메인은 영향받지 않는다.
function rowToRound(r: typeof t.$inferSelect): Round {
  const common = {
    id: Schema.decodeSync(RoundId)(r.id),
    studyId: Schema.decodeSync(StudyId)(r.studyId),
    number: Schema.decodeSync(RoundNumber)(r.roundNumber),
    title: Schema.decodeSync(RoundTitle)(r.title),
    dueAt: r.dueAt == null ? Option.none<EpochMs>() : Option.some(Schema.decodeSync(EpochMs)(r.dueAt)),
    createdAt: Schema.decodeSync(EpochMs)(r.createdAt),
  };
  if (r.status === 'closed') {
    const closed: ClosedRound = {
      ...common,
      _tag: 'Closed',
      closedAt: Schema.decodeSync(EpochMs)(r.closedAt as number),
    };
    return closed;
  }
  const open: OpenRound = { ...common, _tag: 'Open' };
  return open;
}

function rowToSubmission(r: typeof ts.$inferSelect): Submission {
  return {
    id: Schema.decodeSync(SubmissionId)(r.id),
    roundId: Schema.decodeSync(RoundId)(r.roundId),
    participantId: Schema.decodeSync(ParticipantId)(r.participantId),
    url: Schema.decodeSync(Url)(r.url),
    note: r.note == null ? Option.none<string>() : Option.some(r.note),
    createdAt: Schema.decodeSync(EpochMs)(r.createdAt),
  };
}

export class DrizzleRoundRepository implements RoundRepository {
  constructor(private db: D1Database) {}

  async findById(id: RoundId): Promise<Option.Option<RoundAggregate>> {
    const db = createDb(this.db);
    const round = await db.select().from(t).where(eq(t.id, id)).get();
    if (!round) return Option.none();
    const subs = await db.select().from(ts).where(eq(ts.roundId, id)).all();
    return Option.some({ round: rowToRound(round), submissions: subs.map(rowToSubmission) });
  }

  async create(round: OpenRound): Promise<void> {
    const db = createDb(this.db);
    await db.insert(t).values({
      id: round.id,
      studyId: round.studyId,
      roundNumber: round.number,
      title: round.title,
      dueAt: Option.isSome(round.dueAt) ? round.dueAt.value : null,
      createdAt: round.createdAt,
      status: 'open',
      closedAt: null,
    });
  }

  async save(round: Round): Promise<void> {
    const db = createDb(this.db);
    await db
      .update(t)
      .set({
        status: round._tag === 'Closed' ? 'closed' : 'open',
        closedAt: round._tag === 'Closed' ? round.closedAt : null,
      })
      .where(eq(t.id, round.id));
  }

  async addSubmission(s: Submission): Promise<void> {
    const db = createDb(this.db);
    await db.insert(ts).values({
      id: s.id,
      roundId: s.roundId,
      participantId: s.participantId,
      url: s.url,
      note: Option.isSome(s.note) ? s.note.value : null,
      createdAt: s.createdAt,
    });
  }
}
