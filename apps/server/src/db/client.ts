// Drizzle(D1) 인스턴스 팩토리. 각 요청마다 c.env.DB 로부터 생성.
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;

export function createDb(db: D1Database) {
  return drizzle(db, { schema });
}
