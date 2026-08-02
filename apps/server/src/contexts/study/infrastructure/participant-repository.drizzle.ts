import { eq } from 'drizzle-orm';
import { Option, Schema } from 'effect';
import { createDb } from '../../../db/client';
import { participants as t } from '../../../db/schema';
import { ParticipantId, StudyId, EpochMs } from '../domain/branded';
import type { Participant } from '../domain/state';
import type { ParticipantRepository } from '../domain/repository';

function rowToParticipant(r: typeof t.$inferSelect): Participant {
  return {
    id: Schema.decodeSync(ParticipantId)(r.id),
    studyId: Schema.decodeSync(StudyId)(r.studyId),
    name: r.name,
    discordHandle: r.discordHandle == null ? Option.none<string>() : Option.some(r.discordHandle),
    createdAt: Schema.decodeSync(EpochMs)(r.createdAt),
  };
}

export class DrizzleParticipantRepository implements ParticipantRepository {
  constructor(private db: D1Database) {}

  async findByStudy(studyId: StudyId): Promise<ReadonlyArray<Participant>> {
    const db = createDb(this.db);
    const rows = await db.select().from(t).where(eq(t.studyId, studyId)).all();
    return rows.map(rowToParticipant);
  }

  async addMany(participants: ReadonlyArray<Participant>): Promise<void> {
    if (participants.length === 0) return;
    const db = createDb(this.db);
    await db.insert(t).values(
      participants.map((p) => ({
        id: p.id,
        studyId: p.studyId,
        name: p.name,
        discordHandle: Option.isSome(p.discordHandle) ? p.discordHandle.value : null,
        createdAt: p.createdAt,
      })),
    );
  }

  async deleteById(participantId: ParticipantId): Promise<void> {
    const db = createDb(this.db);
    await db.delete(t).where(eq(t.id, participantId));
  }
}
