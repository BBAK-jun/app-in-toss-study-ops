// apps/client/src/query/roundQueries.ts
//
// Round 도메인의 query / mutation hook.
// 제출 등록 시 round status + study 의 roundSummaries 를 동시 무효화.

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type {
  ReminderMessageResponse,
  ReminderOptions,
  RoundStatusDto,
  ShareDiscordRequest,
  ShareDiscordResponse,
  SubmissionCreateInput,
  SubmissionDto,
} from '@studyops/shared';

import { apiClient } from '../lib/api-client';
import { roundKeys, studyKeys } from './queryKeys';

// ──────────────────────────────────────────────────────────────
// Queries (read)
// ──────────────────────────────────────────────────────────────

export function useRoundStatusQuery(roundId: string): UseQueryResult<RoundStatusDto> {
  return useQuery({
    queryKey: roundKeys.status(roundId),
    queryFn: () => apiClient.rounds.getStatus(roundId),
    enabled: roundId !== '',
  });
}

export function useRoundSubmissionsQuery(roundId: string): UseQueryResult<SubmissionDto[]> {
  return useQuery({
    queryKey: roundKeys.submissions(roundId),
    queryFn: () => apiClient.rounds.listSubmissions(roundId),
    enabled: roundId !== '',
  });
}

// ──────────────────────────────────────────────────────────────
// Mutations (write)
// ──────────────────────────────────────────────────────────────

/**
 * 제출 등록 — 성공 시:
 * 1. round status 무효화 (제출자/미제출자 목록 갱신)
 * 2. study 의 roundSummaries 무효화 (제출률 배지 갱신)
 *
 * @param roundId 현재 회차 ID
 * @param studyId 부모 스터디 ID (roundSummaries 무효화용)
 */
export function useCreateSubmissionMutation(roundId: string, studyId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmissionCreateInput) => apiClient.rounds.createSubmission(roundId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roundKeys.status(roundId) });
      if (studyId) {
        qc.invalidateQueries({ queryKey: studyKeys.roundSummaries(studyId) });
      }
    },
  });
}

/**
 * 리마인드 문구 생성 — POST 이지만 캐시 불필요 (일회성 호출).
 */
export function useReminderMessageMutation(roundId: string) {
  return useMutation({
    mutationFn: (options?: ReminderOptions) => apiClient.rounds.getReminderMessage(roundId, options),
  });
}

/**
 * Discord 공유 — 일회성 발송 mutation.
 */
export function useShareDiscordMutation(roundId: string) {
  return useMutation({
    mutationFn: (body?: ShareDiscordRequest) => apiClient.rounds.shareDiscord(roundId, body),
  });
}

/**
 * 리마인드 문구 생성 + Discord 발송을 순차 수행하는 복합 mutation.
 * ReminderPage 에서 사용.
 */
export function useShareReminderMutation(roundId: string) {
  return useMutation({
    mutationFn: async (): Promise<ShareDiscordResponse> => {
      const reminder: ReminderMessageResponse = await apiClient.rounds.getReminderMessage(roundId);
      return apiClient.rounds.shareDiscord(roundId, { message: reminder.message });
    },
  });
}
