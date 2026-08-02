import { eq } from 'drizzle-orm';
import { Option, Schema } from 'effect';
import { createDb } from '../../../db/client';
import { studies as t } from '../../../db/schema';
import { StudyId, UserKey, EpochMs, StudyTitle, Description, WebhookUrl } from '../domain/branded';
import type { Study } from '../domain/state';
import type { StudyRepository } from '../domain/repository';

// 매퍼: row(스키마) ↔ domain Study. discordWebhookUrl/description 은 Option 으로.
function rowToStudy(r: typeof t.$inferSelect): Study {
  return {
    id: Schema.decodeSync(StudyId)(r.id),
    ownerId: Schema.decodeSync(UserKey)(r.ownerId),
    title: Schema.decodeSync(StudyTitle)(r.title),
    description: r.description == null ? Option.none<Description>() : Option.some(Schema.decodeSync(Description)(r.description)),
    discordWebhookUrl:
      r.discordWebhookUrl == null ? Option.none<WebhookUrl>() : Option.some(Schema.decodeSync(WebhookUrl)(r.discordWebhookUrl)),
    createdAt: Schema.decodeSync(EpochMs)(r.createdAt),
  };
}

export class DrizzleStudyRepository implements StudyRepository {
  constructor(private db: D1Database) {}

  async findById(id: StudyId): Promise<Option.Option<Study>> {
    const db = createDb(this.db);
    const row = await db.select().from(t).where(eq(t.id, id)).get();
    return row ? Option.some(rowToStudy(row)) : Option.none();
  }

  async findByOwner(ownerId: UserKey): Promise<ReadonlyArray<Study>> {
    const db = createDb(this.db);
    const rows = await db.select().from(t).where(eq(t.ownerId, ownerId)).all();
    return rows.map(rowToStudy);
  }

  async save(study: Study): Promise<void> {
    const db = createDb(this.db);
    const description = Option.isSome(study.description) ? study.description.value : null;
    const webhook = Option.isSome(study.discordWebhookUrl) ? study.discordWebhookUrl.value : null;
    // upsert: 새 id 면 INSERT, 기존이면 UPDATE. D1/SQLite ON CONFLICT 지원.
    await db
      .insert(t)
      .values({
        id: study.id,
        ownerId: study.ownerId,
        title: study.title,
        description,
        discordWebhookUrl: webhook,
        createdAt: study.createdAt,
      })
      .onConflictDoUpdate({
        target: t.id,
        set: { title: study.title, description, discordWebhookUrl: webhook },
      });
  }
}
