import type {
  LoginResponse,
  SessionUser,
  StudyCreateInput,
  StudyDto,
  StudyUpdateInput,
  ParticipantCreateInput,
  ParticipantDto,
  RoundCreateInput,
  RoundDto,
  RoundSummary,
  RoundStatusDto,
  SubmissionCreateInput,
  SubmissionDto,
  ReminderOptions,
  ReminderMessageResponse,
  ShareDiscordRequest,
  ShareDiscordResponse,
  LogQuery,
  LogQueryResult,
} from '@studyops/shared';
import {
  ApiError,
  createSessionTokenStore,
  createFetchFn,
  type ClientConfig,
  type FetchFn,
  type TokenStore,
} from './client';

export { ApiError, createSessionTokenStore };
export type { ClientConfig, FetchFn, TokenStore };

export interface AuthApi {
  login(authorizationCode: string, referrer: 'DEFAULT' | 'SANDBOX'): Promise<LoginResponse>;
  getMe(): Promise<SessionUser>;
  logout(): Promise<void>;
}

export interface StudiesApi {
  create(input: StudyCreateInput): Promise<StudyDto>;
  list(): Promise<StudyDto[]>;
  get(id: string): Promise<StudyDto>;
  update(id: string, input: StudyUpdateInput): Promise<StudyDto>;
  listParticipants(studyId: string): Promise<ParticipantDto[]>;
  addParticipant(studyId: string, input: ParticipantCreateInput): Promise<ParticipantDto>;
  addParticipants(studyId: string, input: ParticipantCreateInput[]): Promise<ParticipantDto[]>;
  removeParticipant(studyId: string, participantId: string): Promise<void>;
  createRound(studyId: string, input: RoundCreateInput): Promise<RoundDto>;
  listRounds(studyId: string): Promise<RoundDto[]>;
  listRoundSummaries(studyId: string): Promise<RoundSummary[]>;
}

export interface RoundsApi {
  get(roundId: string): Promise<RoundDto>;
  getStatus(roundId: string): Promise<RoundStatusDto>;
  listSubmissions(roundId: string): Promise<SubmissionDto[]>;
  createSubmission(roundId: string, input: SubmissionCreateInput): Promise<SubmissionDto>;
  getReminderMessage(roundId: string, options?: ReminderOptions): Promise<ReminderMessageResponse>;
  shareDiscord(roundId: string, body?: ShareDiscordRequest): Promise<ShareDiscordResponse>;
}

export interface LogsApi {
  fetch(params?: LogQuery): Promise<LogQueryResult>;
}

function buildQueryString(params: LogQuery): string {
  const entries: string[] = [];
  if (params.level) entries.push(`level=${encodeURIComponent(params.level)}`);
  if (params.source) entries.push(`source=${encodeURIComponent(params.source)}`);
  if (params.event) entries.push(`event=${encodeURIComponent(params.event)}`);
  if (params.userId != null) entries.push(`userId=${params.userId}`);
  if (params.requestId) entries.push(`requestId=${encodeURIComponent(params.requestId)}`);
  if (params.sessionId) entries.push(`sessionId=${encodeURIComponent(params.sessionId)}`);
  if (params.search) entries.push(`search=${encodeURIComponent(params.search)}`);
  if (params.since != null) entries.push(`since=${params.since}`);
  if (params.until != null) entries.push(`until=${params.until}`);
  if (params.cursor) entries.push(`cursor=${encodeURIComponent(params.cursor)}`);
  if (params.limit != null) entries.push(`limit=${params.limit}`);
  return entries.join('&');
}

export class StudyOpsClient {
  private readonly tokenStore: TokenStore;
  readonly auth: AuthApi;
  readonly studies: StudiesApi;
  readonly rounds: RoundsApi;
  readonly logs: LogsApi;

  constructor(config: ClientConfig) {
    this.tokenStore = config.tokenStore ?? createSessionTokenStore();
    const f = createFetchFn(config.baseUrl, this.tokenStore);

    this.auth = {
      login: (authorizationCode, referrer) =>
        f<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ authorizationCode, referrer }),
        }),
      getMe: () => f<SessionUser>('/auth/me'),
      logout: () => f<void>('/auth/logout', { method: 'POST' }),
    };

    this.studies = {
      create: (input) => f<StudyDto>('/studies', { method: 'POST', body: JSON.stringify(input) }),
      list: () => f<StudyDto[]>('/studies'),
      get: (id) => f<StudyDto>(`/studies/${id}`),
      update: (id, input) =>
        f<StudyDto>(`/studies/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
      listParticipants: (studyId) => f<ParticipantDto[]>(`/studies/${studyId}/participants`),
      addParticipant: (studyId, input) =>
        f<ParticipantDto>(`/studies/${studyId}/participants`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      addParticipants: (studyId, input) =>
        f<ParticipantDto[]>(`/studies/${studyId}/participants`, {
          method: 'POST',
          body: JSON.stringify({ participants: input }),
        }),
      removeParticipant: (studyId, participantId) =>
        f<void>(`/studies/${studyId}/participants/${participantId}`, { method: 'DELETE' }),
      createRound: (studyId, input) =>
        f<RoundDto>(`/studies/${studyId}/rounds`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      listRounds: (studyId) => f<RoundDto[]>(`/studies/${studyId}/rounds`),
      listRoundSummaries: (studyId) =>
        f<RoundSummary[]>(`/studies/${studyId}/rounds/status`),
    };

    this.rounds = {
      get: (roundId) => f<RoundDto>(`/rounds/${roundId}`),
      getStatus: (roundId) => f<RoundStatusDto>(`/rounds/${roundId}/status`),
      listSubmissions: (roundId) => f<SubmissionDto[]>(`/rounds/${roundId}/submissions`),
      createSubmission: (roundId, input) =>
        f<SubmissionDto>(`/rounds/${roundId}/submissions`, {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      getReminderMessage: (roundId, options) =>
        f<ReminderMessageResponse>(`/rounds/${roundId}/reminder-message`, {
          method: 'POST',
          body: JSON.stringify(options ?? {}),
        }),
      shareDiscord: (roundId, body) =>
        f<ShareDiscordResponse>(`/rounds/${roundId}/share-discord`, {
          method: 'POST',
          body: JSON.stringify(body ?? {}),
        }),
    };

    this.logs = {
      fetch: (params: LogQuery = {}) => {
        const qs = buildQueryString(params);
        const path = qs ? `/admin/logs?${qs}` : '/admin/logs';
        return f<LogQueryResult>(path);
      },
    };
  }

  getToken(): string | null {
    return this.tokenStore.get();
  }

  setToken(token: string): void {
    this.tokenStore.set(token);
  }

  clearToken(): void {
    this.tokenStore.clear();
  }
}
