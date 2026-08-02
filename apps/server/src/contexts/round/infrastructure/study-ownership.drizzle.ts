import { eq } from 'drizzle-orm';
import { Option, Schema } from 'effect';
import { createDb } from '../../../db/client';
import { studies, participants as p } from '../../../db/schema';
import type { StudyOwnershipService } from '../application/ports';
import { StudyId, ParticipantId, UserKey } from '../domain/branded';
import type { ParticipantInfo } from '../domain/aggregate';

// 소유권/소속 '사실' 조회 구현체 — IO 를 도메인 밖으로 빼낸 포트의 구현.
// 도메인은 이 결과(boolean)로만 불변식을 판단한다.
export class DrizzleStudyOwnershipService implements StudyOwnershipService {
  constructor(private db: D1Database) {}

  async isOwner(studyId: StudyId, userKey: UserKey): Promise<boolean> {
    const db = createDb(this.db);
    const row = await db.select({ ownerId: studies.ownerId }).from(studies).where(eq(studies.id, studyId)).get();
    return row?.ownerId === userKey;
  }

  async participantBelongsToStudy(participantId: ParticipantId, studyId: StudyId): Promise<boolean> {
    const db = createDb(this.db);
    const row = await db.select({ studyId: p.studyId }).from(p).where(eq(p.id, participantId)).get();
    return row?.studyId === (studyId as string);
  }

  async participantsOf(studyId: StudyId): Promise<ReadonlyArray<ParticipantInfo>> {
    const db = createDb(this.db);
    const rows = await db.select().from(p).where(eq(p.studyId, studyId)).all();
    return rows.map((r) => ({
      id: Schema.decodeSync(ParticipantId)(r.id),
      name: r.name,
      discordHandle: r.discordHandle == null ? Option.none<string>() : Option.some(r.discordHandle),
    }));
  }

  async webhookOf(studyId: StudyId): Promise<Option.Option<string>> {
    const db = createDb(this.db);
    const row = await db
      .select({ webhook: studies.discordWebhookUrl })
      .from(studies)
      .where(eq(studies.id, studyId))
      .get();
    return row?.webhook ? Option.some(row.webhook) : Option.none();
  }
}
