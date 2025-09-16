import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import chatRouter from './modules/chat/chat.router.js';
import { config } from './config/environment.js';
import { initDatabase } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/errorHandler.js';
import { wsManager } from './shared/websocket/manager.js';

// Route imports
import { authRouter } from './modules/auth/routes.js';
import { directorRouter } from './modules/director/routes/index.js';
import { productionRouter } from './modules/production/routes/index.js';
import { productsRouter } from './modules/products/routes.js';

export const createApp = async () => {
  // Initialize database
  await initDatabase();

  const app = express();

  // Security middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

// CORS configuration — aceita string OU string[] no config.CORS_ORIGIN
const rawOrigins = config.CORS_ORIGIN as string | string[] | undefined;

// Normaliza para array de strings:
const allowlist: string[] = Array.isArray(rawOrigins)
  ? rawOrigins
  : (rawOrigins || '*')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

app.use(
  cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant'],
    origin(
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      // permite ferramentas internas/SSR (sem header Origin)
      if (!origin) return callback(null, true);
      if (allowlist.includes('*') || allowlist.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);



  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ✅ Chatbot API (SGMI)
  app.use('/api', chatRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.NODE_ENV,
        websocket_clients: wsManager.getConnectedClientsCount(),
      },
    });
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/director', directorRouter);
  app.use('/api/production', productionRouter);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'endpoint_not_found',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
};

export { wsManager };
