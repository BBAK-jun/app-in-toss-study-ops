# @studyops/shared

StudyOps Bot의 서버(`apps/server`)와 클라이언트(`apps/client`)가 공유하는 타입 패키지.
빌드 스텝 없이 소스(`src/index.ts`)를 직접 참조 — npm workspaces 심볼릭 링크 + `package.json`의 `main`/`types`로 해결.

## 구성

| 파일 | 내용 |
|---|---|
| `entities.ts` | DB 엔티티 원형 (User, Study, Round, Participant, Submission) |
| `auth.ts` | 인증 DTO (LoginRequest, LoginResponse, SessionUser) |
| `studies.ts` | 스터디 DTO (StudyCreateInput, StudyUpdateInput, StudyDto) |
| `rounds.ts` | 회차 DTO (RoundCreateInput, RoundDto, RoundStatusDto, SubmittedEntry, ReminderOptions, ReminderMessageResponse, ShareDiscordRequest, ShareDiscordResponse) |
| `participants.ts` | 참여자 DTO (ParticipantCreateInput, ParticipantDto) |
| `submissions.ts` | 제출 DTO (SubmissionCreateInput, SubmissionDto) |
| `errors.ts` | 에러 응답 (ApiErrorCode, ApiErrorBody, ApiErrorResponse) |
| `index.ts` | 위 모두 re-export |

## 사용법

```typescript
import type { StudyDto, RoundStatusDto, ApiErrorResponse } from '@studyops/shared';
```

## 관례

- 모든 타임스탬프(`createdAt`, `dueAt`)는 **epoch milliseconds (number)**.
- `userKey`는 `number` (Toss 식별자). 나머지 엔티티 ID는 `string` (uuid).
- nullable 필드는 `T | null` (예: `description: string | null`).
