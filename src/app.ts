import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
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

  // CORS configuration
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
