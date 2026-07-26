interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  ALLOWED_ORIGINS?: string;
}

export interface SecretBindings {}

export type AppEnv = {
  Bindings: Env & SecretBindings;
  Variables: {
    requestId: string;
  };
};
