import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],

  // Database
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: Number(process.env.DB_PORT) || 5432,
    USER: process.env.DB_USER || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'postgres',
    NAME: process.env.DB_NAME || 'sgmi',
  },

  // JWT
  JWT: {
    SECRET:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET ||
      'your-super-secret-refresh-key-change-in-production',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    MAX_REQUESTS: Number(process.env.RATE_LIMIT_MAX) || 600,
  },

  // WebSocket
  WEBSOCKET: {
    PATH: process.env.WS_PATH || '/ws',
  },
};

// Validation
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0 && config.NODE_ENV === 'production') {
  console.error(
    '❌ Missing required environment variables:',
    missingEnvVars.join(', ')
  );
  process.exit(1);
}

if (config.NODE_ENV === 'development' && missingEnvVars.length > 0) {
  console.warn(
    '⚠️  Using default values for environment variables:',
    missingEnvVars.join(', ')
  );
  console.warn('⚠️  Make sure to set these in production!');
}
