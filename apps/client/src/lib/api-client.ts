import { StudyOpsClient, ApiError } from '@studyops/client-sdk';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const apiClient = new StudyOpsClient({ baseUrl });
export { ApiError };
