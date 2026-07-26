// 스터디 관련 DTO (/studies CRUD)

// POST /studies Request body
export interface StudyCreateInput {
  title: string;
  description?: string;
}

// PATCH /studies/:id Request body — 부분 업데이트.
// discordWebhookUrl 에 null 허용 (webhook 삭제).
export interface StudyUpdateInput {
  title?: string;
  description?: string | null;
  discordWebhookUrl?: string | null;
}

// 스터디 응답 (POST/GET/PATCH 공통)
export interface StudyDto {
  id: string;
  ownerId: number;
  title: string;
  description: string | null;
  discordWebhookUrl: string | null;
  createdAt: number;
}
