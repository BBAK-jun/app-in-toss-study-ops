import type {
  ReminderMessageResponse,
  ReminderOptions,
  RoundDto,
  RoundStatusDto,
  ShareDiscordRequest,
  ShareDiscordResponse,
  SubmissionCreateInput,
  SubmissionDto,
} from '@studyops/shared';
import { apiFetch } from './client';

// GET /rounds/:id — 회차 상세.
export function getRound(roundId: string): Promise<RoundDto> {
  return apiFetch<RoundDto>(`/rounds/${roundId}`);
}

// GET /rounds/:id/status — 제출 현황(MVP 핵심). 제출자/미제출자/제출률.
export function getRoundStatus(roundId: string): Promise<RoundStatusDto> {
  return apiFetch<RoundStatusDto>(`/rounds/${roundId}/status`);
}

// GET /rounds/:id/submissions — 제출 목록.
export function listSubmissions(roundId: string): Promise<SubmissionDto[]> {
  return apiFetch<SubmissionDto[]>(`/rounds/${roundId}/submissions`);
}

// POST /rounds/:id/submissions — 제출 링크 등록. 중복 시 409 CONFLICT.
export function createSubmission(
  roundId: string,
  input: SubmissionCreateInput,
): Promise<SubmissionDto> {
  return apiFetch<SubmissionDto>(`/rounds/${roundId}/submissions`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// POST /rounds/:id/reminder-message — 리마인드 문구 생성(서버가 미제출자 기반으로 자동 생성).
export function getReminderMessage(
  roundId: string,
  options?: ReminderOptions,
): Promise<ReminderMessageResponse> {
  return apiFetch<ReminderMessageResponse>(`/rounds/${roundId}/reminder-message`, {
    method: 'POST',
    body: JSON.stringify(options ?? {}),
  });
}

// POST /rounds/:id/share-discord — Discord webhook 발송.
export function shareDiscord(
  roundId: string,
  body?: ShareDiscordRequest,
): Promise<ShareDiscordResponse> {
  return apiFetch<ShareDiscordResponse>(`/rounds/${roundId}/share-discord`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}
