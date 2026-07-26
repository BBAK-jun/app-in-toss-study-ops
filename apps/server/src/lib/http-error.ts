// 통일 에러 클래스. 라우트/인증/Discord 어디서든 throw → errorHandler가 포맷팅.
import type { ApiErrorCode } from '@studyops/shared';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
