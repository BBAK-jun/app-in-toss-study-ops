// 회차 관련 DTO (/studies/:id/rounds, /rounds/:id/*)

import type { ParticipantDto } from './participants';
import type { SubmissionDto } from './submissions';

// POST /studies/:id/rounds Request body
export interface RoundCreateInput {
  roundNumber: number;
  title: string;
  dueAt?: number;
}

// 회차 응답
export interface RoundDto {
  id: string;
  studyId: string;
  roundNumber: number;
  title: string;
  dueAt: number | null;
  createdAt: number;
}

// 제출자 + 제출 정보 묶음 (GET /rounds/:id/status 의 submitted 배열 원소)
export interface SubmittedEntry {
  participant: ParticipantDto;
  submission: SubmissionDto;
}

// GET /rounds/:id/status Response — MVP 핵심 엔드포인트.
// total: 스터디 참여자 총원
// rate: 0~1 (submitted.length / total)
export interface RoundStatusDto {
  roundId: string;
  roundNumber: number;
  title: string;
  dueAt: number | null;
  total: number;
  submitted: SubmittedEntry[];
  notSubmitted: ParticipantDto[];
  rate: number;
}

// POST /rounds/:id/reminder-message Request (옵션)
export interface ReminderOptions {
  tone?: 'friendly' | 'formal';
}

// POST /rounds/:id/reminder-message Response
// 서버가 미제출자 목록 + 회차 정보로 문구 자동 생성.
export interface ReminderMessageResponse {
  message: string;
}

// POST /rounds/:id/share-discord Request (선택)
// webhookUrl 미제공 시 study.discordWebhookUrl 사용. 둘 다 없으면 400.
// message 미제공 시 현황 요약 자동 생성.
export interface ShareDiscordRequest {
  webhookUrl?: string;
  message?: string;
}

// POST /rounds/:id/share-discord Response
export interface ShareDiscordResponse {
  ok: true;
  discordResponse?: unknown;
}
