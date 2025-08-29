import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
class PrismaManager {
  private static instance: PrismaClient | null = null;

  public static getInstance(): PrismaClient {
    if (!PrismaManager.instance) {
      PrismaManager.instance = new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        errorFormat: 'pretty',
      });

      // Handle graceful shutdown
      process.on('beforeExit', async () => {
        await PrismaManager.disconnect();
      });

      process.on('SIGINT', async () => {
        await PrismaManager.disconnect();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await PrismaManager.disconnect();
        process.exit(0);
      });
    }

    return PrismaManager.instance;
  }

  public static async connect(): Promise<PrismaClient> {
    const prisma = PrismaManager.getInstance();

    try {
      // Test the connection
      await prisma.$connect();
      console.log('✅ Database connected successfully');
      return prisma;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (PrismaManager.instance) {
      await PrismaManager.instance.$disconnect();
      PrismaManager.instance = null;
      console.log('🔌 Database disconnected');
    }
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      const prisma = PrismaManager.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export the singleton instance
export const prisma = PrismaManager.getInstance();
export { PrismaManager };

// For backward compatibility
export const initDatabase = PrismaManager.connect;
export const closeDatabase = PrismaManager.disconnect;
export const getDatabase = PrismaManager.getInstance;
