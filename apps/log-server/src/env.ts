interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
  LOG_ARCHIVE?: R2Bucket;
  LOGS_ANALYTICS?: AnalyticsEngineDataset;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
}

export interface SecretBindings {
  CF_API_TOKEN?: string;
}

export type AppEnv = {
  Bindings: Env & SecretBindings;
  Variables: {
    requestId: string;
  };
};
