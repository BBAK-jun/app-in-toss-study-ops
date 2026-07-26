// 제출 관련 DTO (/rounds/:id/submissions)

// POST /rounds/:id/submissions Request body
// UNIQUE(roundId, participantId) 위반 시 409 CONFLICT.
export interface SubmissionCreateInput {
  participantId: string;
  url: string;
  note?: string;
}

// 제출 응답
export interface SubmissionDto {
  id: string;
  roundId: string;
  participantId: string;
  url: string;
  note: string | null;
  createdAt: number;
}
