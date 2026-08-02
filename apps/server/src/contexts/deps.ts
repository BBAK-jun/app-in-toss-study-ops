// Presentation 공용 DI 팩토리 — Hono 컨텍스트로부터 각 컨텍스트의 deps 를 조립.
// principal 은 인증 미들웨어의 userKey 를 branded UserKey 로 변환.
import type { Context } from 'hono';
import { Schema } from 'effect';
import type { AppEnv } from '../env';
import { UserKey } from './shared/domain/branded';
import type { RoundDeps } from './round/application/use-cases';
import type { StudyDeps } from './study/application/use-cases';

function userKey(c: Context<AppEnv>) {
  return Schema.decodeSync(UserKey)(c.get('user').userKey);
}

export function roundDeps(c: Context<AppEnv>): RoundDeps {
  return {
    uow: c.get('newUow')(),
    ownership: c.get('newOwnership')(),
    ids: c.get('ids'),
    clock: c.get('clock'),
    principal: { userKey: userKey(c) },
  };
}

export function studyDeps(c: Context<AppEnv>): StudyDeps {
  return {
    uow: c.get('newStudyUow')(),
    ids: c.get('studyIds'),
    clock: c.get('clock'),
    principal: { userKey: userKey(c) },
  };
}
