// apps/client/src/query/studyQueries.ts
//
// Study 도메인의 모든 query / mutation hook.
// API 함수(api/studies.ts)를 감싸서 TanStack Query 패턴으로 제공.
// mutation 은 성공 시 관련 query 를 자동 무효화한다.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query';
import type {
  ParticipantCreateInput,
  ParticipantDto,
  RoundCreateInput,
  RoundDto,
  StudyCreateInput,
  StudyDto,
  StudyUpdateInput,
} from '@studyops/shared';

import {
  addParticipant,
  createRound,
  createStudy,
  getStudy,
  listParticipants,
  listRoundSummaries,
  listRounds,
  listStudies,
  removeParticipant,
  updateStudy,
  type RoundSummary,
} from '../api/studies';
import { studyKeys } from './queryKeys';

// ──────────────────────────────────────────────────────────────
// Queries (read)
// ──────────────────────────────────────────────────────────────

export function useStudiesQuery(): UseQueryResult<StudyDto[]> {
  return useQuery({
    queryKey: studyKeys.list(),
    queryFn: listStudies,
  });
}

export function useStudyQuery(studyId: string): UseQueryResult<StudyDto> {
  return useQuery({
    queryKey: studyKeys.detail(studyId),
    queryFn: () => getStudy(studyId),
    enabled: studyId !== '',
  });
}

export function useStudyRoundsQuery(studyId: string): UseQueryResult<RoundDto[]> {
  return useQuery({
    queryKey: studyKeys.rounds(studyId),
    queryFn: () => listRounds(studyId),
    enabled: studyId !== '',
  });
}

export function useRoundSummariesQuery(studyId: string): UseQueryResult<RoundSummary[]> {
  return useQuery({
    queryKey: studyKeys.roundSummaries(studyId),
    queryFn: () => listRoundSummaries(studyId),
    enabled: studyId !== '',
  });
}

export function useStudyParticipantsQuery(studyId: string): UseQueryResult<ParticipantDto[]> {
  return useQuery({
    queryKey: studyKeys.participants(studyId),
    queryFn: () => listParticipants(studyId),
    enabled: studyId !== '',
  });
}

// ──────────────────────────────────────────────────────────────
// Mutations (write) — 성공 시 자동 무효화
// ──────────────────────────────────────────────────────────────

export function useCreateStudyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudyCreateInput) => createStudy(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyKeys.lists() });
    },
  });
}

export function useUpdateStudyMutation(studyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudyUpdateInput) => updateStudy(studyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyKeys.detail(studyId) });
    },
  });
}

export function useCreateRoundMutation(studyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RoundCreateInput) => createRound(studyId, input),
    onSuccess: () => {
      // 회차 목록 + 제출률 요약 둘 다 갱신
      qc.invalidateQueries({ queryKey: studyKeys.rounds(studyId) });
      qc.invalidateQueries({ queryKey: studyKeys.roundSummaries(studyId) });
    },
  });
}

export function useAddParticipantMutation(studyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ParticipantCreateInput) => addParticipant(studyId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyKeys.participants(studyId) });
    },
  });
}

export function useRemoveParticipantMutation(studyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participantId: string) => removeParticipant(studyId, participantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studyKeys.participants(studyId) });
    },
  });
}
