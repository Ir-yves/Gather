import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('strict'),
  MYSQL_HOST: z.string().min(1),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1),
  MYSQL_PASSWORD: z.string(),
  MYSQL_DATABASE: z.string().min(1),
  MYSQL_SSL_CA: z.string().default(''),
  LIVEKIT_URL: z.string().default(''),
  LIVEKIT_API_KEY: z.string().default(''),
  LIVEKIT_API_SECRET: z.string().default('')
}).superRefine((values, context) => {
  if (values.NODE_ENV === 'production' && !values.MYSQL_SSL_CA.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['MYSQL_SSL_CA'],
      message: 'MYSQL_SSL_CA is required in production to verify the database TLS connection'
    });
  }
});

export const config = configSchema.parse(process.env);
export const isProduction = config.NODE_ENV === 'production';

export function isLiveKitConfigured(): boolean {
  if (!config.LIVEKIT_API_KEY || !config.LIVEKIT_API_SECRET) return false;
  try {
    const url = new URL(config.LIVEKIT_URL);
    return (url.protocol === 'wss:' || url.protocol === 'ws:')
      && url.hostname !== 'your-project.livekit.cloud';
  } catch {
    return false;
  }
}
