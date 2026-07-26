import type {
  ParticipantCreateInput,
  ParticipantDto,
  RoundCreateInput,
  RoundDto,
  StudyCreateInput,
  StudyDto,
  StudyUpdateInput,
} from '@studyops/shared';
import { apiFetch } from './client';

// POST /studies — 스터디 생성.
export function createStudy(input: StudyCreateInput): Promise<StudyDto> {
  return apiFetch<StudyDto>('/studies', { method: 'POST', body: JSON.stringify(input) });
}

// GET /studies — 내(ownerId=나) 스터디 목록.
export function listStudies(): Promise<StudyDto[]> {
  return apiFetch<StudyDto[]>('/studies');
}

// GET /studies/:id — 스터디 상세.
export function getStudy(id: string): Promise<StudyDto> {
  return apiFetch<StudyDto>(`/studies/${id}`);
}

// PATCH /studies/:id — 부분 업데이트(webhook URL 설정/삭제 등). discordWebhookUrl=null 허용.
export function updateStudy(id: string, input: StudyUpdateInput): Promise<StudyDto> {
  return apiFetch<StudyDto>(`/studies/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}

// GET /studies/:id/participants — 참여자 목록.
export function listParticipants(studyId: string): Promise<ParticipantDto[]> {
  return apiFetch<ParticipantDto[]>(`/studies/${studyId}/participants`);
}

// POST /studies/:id/participants — 참여자 1명 추가.
export function addParticipant(
  studyId: string,
  input: ParticipantCreateInput,
): Promise<ParticipantDto> {
  return apiFetch<ParticipantDto>(`/studies/${studyId}/participants`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// POST /studies/:id/participants — 복수 등록({ participants: [...] } 형태, 문서 4-3 권장).
export function addParticipants(
  studyId: string,
  input: ParticipantCreateInput[],
): Promise<ParticipantDto[]> {
  return apiFetch<ParticipantDto[]>(`/studies/${studyId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ participants: input }),
  });
}

// DELETE /studies/:id/participants/:pid — 참여자 삭제.
export function removeParticipant(studyId: string, participantId: string): Promise<void> {
  return apiFetch<void>(`/studies/${studyId}/participants/${participantId}`, {
    method: 'DELETE',
  });
}

// POST /studies/:id/rounds — 회차 생성.
export function createRound(studyId: string, input: RoundCreateInput): Promise<RoundDto> {
  return apiFetch<RoundDto>(`/studies/${studyId}/rounds`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// GET /studies/:id/rounds — 회차 목록.
export function listRounds(studyId: string): Promise<RoundDto[]> {
  return apiFetch<RoundDto[]>(`/studies/${studyId}/rounds`);
}

export interface RoundSummary {
  roundId: string;
  roundNumber: number;
  title: string;
  dueAt: number | null;
  submittedCount: number;
  total: number;
  rate: number;
}

// GET /studies/:id/rounds/status — 회차별 제출률 배치 조회.
export function listRoundSummaries(studyId: string): Promise<RoundSummary[]> {
  return apiFetch<RoundSummary[]>(`/studies/${studyId}/rounds/status`);
}
