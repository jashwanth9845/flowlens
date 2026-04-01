import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  EMAIL_SERVER_HOST: z.string().optional(),
  EMAIL_SERVER_PORT: z.coerce.number().optional(),
  EMAIL_SERVER_USER: z.string().optional(),
  EMAIL_SERVER_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  FIGMA_CLIENT_ID: z.string().optional(),
  FIGMA_CLIENT_SECRET: z.string().optional(),
  FIGMA_OAUTH_REDIRECT_URI: z.string().url().optional(),
  APP_ENCRYPTION_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  PG_BOSS_SCHEMA: z.string().optional(),
});

type Env = z.infer<typeof envSchema> & {
  appUrl: string;
};

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.parse(process.env);
  cachedEnv = {
    ...parsed,
    appUrl: parsed.NEXTAUTH_URL ?? "http://localhost:3000",
  };

  return cachedEnv;
}

export function hasDatabase() {
  return Boolean(getEnv().DATABASE_URL);
}

export function hasFigmaOAuth() {
  const env = getEnv();
  return Boolean(env.FIGMA_CLIENT_ID && env.FIGMA_CLIENT_SECRET && env.FIGMA_OAUTH_REDIRECT_URI);
}

export function hasEmailAuth() {
  const env = getEnv();
  return Boolean(
    env.EMAIL_FROM &&
      env.EMAIL_SERVER_HOST &&
      env.EMAIL_SERVER_PORT &&
      env.EMAIL_SERVER_USER &&
      env.EMAIL_SERVER_PASSWORD,
  );
}

export function hasS3Storage() {
  const env = getEnv();
  return Boolean(
    env.S3_BUCKET &&
      env.S3_REGION &&
      env.S3_ACCESS_KEY_ID &&
      env.S3_SECRET_ACCESS_KEY,
  );
}
