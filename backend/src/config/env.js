import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  SEED_MODE: z.enum(['demo', 'large']).default('demo'),
  SEED_RESET: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  KPI_CACHE_TTL_SECONDS: z.coerce.number().default(60),
  DEFAULT_CURRENCY_CODE: z.string().default('PKR'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Karachi')
});

export const validateEnv = (customEnv = process.env) => {
  const result = envSchema.safeParse(customEnv);
  if (!result.success) {
    console.error('\n❌ [Configuration Error] Invalid or missing environment variables:');
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file or reference .env.example.\n');
    throw new Error('Environment configuration validation failed.');
  }
  return result.data;
};

export const env = process.env.NODE_ENV === 'test'
  ? {
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/sales_dashboard_test',
      PORT: 4000,
      NODE_ENV: 'test',
      JWT_SECRET: process.env.JWT_SECRET || 'test_jwt_secret_key_sales_ops_12345678',
      JWT_EXPIRES_IN: '8h',
      SEED_MODE: 'demo',
      SEED_RESET: true,
      KPI_CACHE_TTL_SECONDS: 60,
      DEFAULT_CURRENCY_CODE: 'PKR',
      DEFAULT_TIMEZONE: 'Asia/Karachi'
    }
  : validateEnv(process.env);
