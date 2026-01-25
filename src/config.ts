import 'dotenv/config';

export type AppConfig = {
  PORT: number;
  ODYSSEY_API_KEY: string;
  CORS_ORIGIN: string;
  JSON_LIMIT: string;
};

function requireEnv(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export const config: AppConfig = {
  PORT: Number(process.env.PORT ?? 3000),
  ODYSSEY_API_KEY: requireEnv('ODYSSEY_API_KEY'),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  JSON_LIMIT: process.env.JSON_LIMIT ?? '1mb',
};
