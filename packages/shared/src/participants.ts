// 참여자 관련 DTO (/studies/:id/participants)

// POST /studies/:id/participants Request body
// 복수 등록 지원: { participants: ParticipantCreateInput[] } 형태도 허용 (서버 구현).
export interface ParticipantCreateInput {
  name: string;
  discordHandle?: string;
}

// 참여자 응답
export interface ParticipantDto {
  id: string;
  studyId: string;
  name: string;
  discordHandle: string | null;
  createdAt: number;
}
