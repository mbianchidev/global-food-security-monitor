import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_NAME: z.string().default('food_security_monitor'),
  DB_USER: z.string().default('root'),
  DB_PASS: z.string().default(''),

  CORS_ORIGIN: z.string().default('*'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_NAME: z.string().default('GFSM_SESSID'),
  SESSION_LIFETIME: z.coerce.number().int().positive().default(3600),

  FAO_API_BASE: z.string().url().default('https://www.fao.org/faostat/api/v1'),
  FAO_API_KEY: z.string().default(''),
  WFP_API_BASE: z.string().url().default('https://api.wfp.org/vam-data-bridges/4.0.0'),
  WFP_API_KEY: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
