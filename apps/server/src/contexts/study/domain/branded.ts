// Study 전용 branded 원시값 + 공유 커널 재수출.
import { Schema } from 'effect';

export * from '../../shared/domain/branded';

export const StudyTitle = Schema.String.pipe(Schema.minLength(1)).pipe(Schema.brand('StudyTitle'));
export type StudyTitle = Schema.Schema.Type<typeof StudyTitle>;

// 설명은 빈 문자열도 허용(기존 데이터 호환).
export const Description = Schema.String.pipe(Schema.brand('Description'));
export type Description = Schema.Schema.Type<typeof Description>;

// Discord webhook URL — 기존 임의 문자열 호환을 위해 http(s) 검증만.
export const WebhookUrl = Schema.String.pipe(Schema.pattern(/^https?:\/\//)).pipe(Schema.brand('WebhookUrl'));
export type WebhookUrl = Schema.Schema.Type<typeof WebhookUrl>;
