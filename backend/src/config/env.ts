// backend/src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  // General
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),

  // MySQL credentials
  MYSQL_HOST: z.string(),
  MYSQL_PORT: z.string().default('3306'),
  MYSQL_DATABASE: z.string(),
  MYSQL_READER_USER: z.string(),
  MYSQL_READER_PASSWORD: z.string(),
  MYSQL_WRITER_USER: z.string(),
  MYSQL_WRITER_PASSWORD: z.string(),

  // PostgreSQL credentials
  POSTGRES_HOST: z.string(),
  POSTGRES_PORT: z.string().default('5432'),
  POSTGRES_DATABASE: z.string(),
  POSTGRES_READER_USER: z.string(),
  POSTGRES_READER_PASSWORD: z.string(),
  POSTGRES_WRITER_USER: z.string(),
  POSTGRES_WRITER_PASSWORD: z.string(),
  // Groq API credentials
  GROQ_API_KEY: z.string(),
  GROQ_MODEL: z.string(),
});

export const config = (() => {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
})();
