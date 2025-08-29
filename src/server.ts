import http from 'http';
import { createApp, wsManager } from './app.js';
import { config } from './config/environment.js';
import { closeDatabase } from './shared/database/prisma.js';

const startServer = async () => {
  try {
    console.log('🚀 Starting SGMI Backend Server...');
    console.log(`📊 Environment: ${config.NODE_ENV}`);

    // Create Express app
    const app = await createApp();

    // Create HTTP server
    const server = http.createServer(app);

    // Attach WebSocket server
    wsManager.attachToServer(server, config.WEBSOCKET.PATH);

    // Start listening
    server.listen(config.PORT, () => {
      console.log(`✅ Server running on port ${config.PORT}`);
      console.log(`🌐 Health check: http://localhost:${config.PORT}/health`);
      console.log(
        `📡 WebSocket: ws://localhost:${config.PORT}${config.WEBSOCKET.PATH}`
      );

      if (config.NODE_ENV === 'development') {
        console.log('\n📋 Available API endpoints:');
        console.log('  Authentication:');
        console.log('    POST /api/auth/login');
        console.log('    POST /api/auth/register');
        console.log('    POST /api/auth/refresh');
        console.log('    GET  /api/auth/profile');
        console.log('  Products:');
        console.log('    GET  /api/products');
        console.log('    POST /api/products');
        console.log('  Director:');
        console.log('    POST /api/director/production-plans');
        console.log('    GET  /api/director/reports/production');
        console.log('  Production:');
        console.log('    POST /api/production/entries');
        console.log('    POST /api/production/batches');
        console.log('    POST /api/production/batches/:id/actions');
      }
    });

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

      server.close(async () => {
        console.log('🔌 HTTP server closed');

        try {
          wsManager.close();
          await closeDatabase();
          console.log('✅ Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⏰ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
