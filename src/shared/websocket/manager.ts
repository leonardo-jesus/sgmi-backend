import type { Server } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocket, WebSocketServer } from 'ws';
import type { UserRole, UUID } from '../types/common.js';

export interface WebSocketClient extends WebSocket {
  userId?: UUID;
  userRole?: UserRole;
  isAlive?: boolean;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: Date;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private timerInterval: NodeJS.Timeout | null = null;

  public attachToServer(server: Server, path: string = '/ws'): void {
    this.wss = new WebSocketServer({
      server,
      path,
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    this.startTimerBroadcast();

    console.log(`✅ WebSocket server attached to ${path}`);
  }

  private verifyClient(info: any): boolean {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token || !process.env.JWT_SECRET) {
        return false;
      }

      jwt.verify(token, process.env.JWT_SECRET);
      return true;
    } catch {
      return false;
    }
  }

  private handleConnection(ws: WebSocketClient, request: any): void {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (token && process.env.JWT_SECRET) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        ws.userId = decoded.sub;
        ws.userRole = decoded.role;
      }

      ws.isAlive = true;
      this.clients.add(ws);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection_established',
        data: { message: 'Connected to SGMI WebSocket server' },
        timestamp: new Date(),
      });

      console.log(`📡 Client connected. Total clients: ${this.clients.size}`);
    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close();
    }
  }

  private handleMessage(ws: WebSocketClient, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', timestamp: new Date() });
          break;
        case 'subscribe_batch_updates':
          // Client wants to receive batch updates
          break;
        case 'batch_action':
          this.handleBatchAction(ws, message.data);
          break;
        default:
          console.log('Received unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) {
          this.clients.delete(ws);
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  private startTimerBroadcast(): void {
    this.timerInterval = setInterval(async () => {
      try {
        // Import BatchService dynamically to avoid circular dependency
        const { BatchService } = await import('../../modules/production/services/BatchService.js');
        const batchService = new BatchService();

        // Get active batches (IN_PROGRESS status)
        const { prisma } = await import('../../shared/database/prisma.js');
        const activeBatches = await prisma.batch.findMany({
          where: { status: 'IN_PROGRESS' },
          include: {
            productionPlan: {
              include: { product: true }
            }
          }
        });

        // Broadcast timer updates for each active batch
        for (const batch of activeBatches) {
          if (batch.startTime) {
            const now = new Date();
            const elapsedSeconds = Math.floor((now.getTime() - batch.startTime.getTime()) / 1000);

            this.broadcastToBatchOperators({
              type: 'batch_timer_update',
              data: {
                batchId: batch.id,
                batchNumber: batch.batchNumber,
                productionPlanId: batch.productionPlanId,
                productName: batch.productionPlan.product.name,
                elapsedSeconds,
                status: batch.status
              }
            });
          }
        }
      } catch (error) {
        console.error('Error in timer broadcast:', error);
      }
    }, 1000); // 1 second interval
  }

  public sendToClient(ws: WebSocketClient, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(
    message: WebSocketMessage,
    filter?: (client: WebSocketClient) => boolean
  ): void {
    const messageStr = JSON.stringify({
      ...message,
      timestamp: message.timestamp || new Date(),
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        if (!filter || filter(client)) {
          client.send(messageStr);
        }
      }
    });
  }

  public broadcastToBatchOperators(message: WebSocketMessage): void {
    this.broadcast(
      message,
      (client) =>
        client.userRole === 'OPERATOR' ||
        client.userRole === 'MANAGER' ||
        client.userRole === 'DIRECTOR'
    );
  }

  public broadcastToDirectors(message: WebSocketMessage): void {
    this.broadcast(
      message,
      (client) =>
        client.userRole === 'DIRECTOR' || client.userRole === 'MANAGER'
    );
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  private async handleBatchAction(ws: WebSocketClient, data: any): Promise<void> {
    try {
      const { batchId, action } = data;

      if (!batchId || !action) {
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Invalid batch action data' },
        });
        return;
      }

      // Import BatchService dynamically to avoid circular dependency
      const { BatchService } = await import('../../modules/production/services/BatchService.js');
      const batchService = new BatchService();

      // Perform the batch action
      await batchService.performBatchAction(batchId, action);

      // Send success response
      this.sendToClient(ws, {
        type: 'batch_action_success',
        data: { batchId, action: action.action },
      });
    } catch (error: any) {
      console.error('Error handling batch action:', error);
      this.sendToClient(ws, {
        type: 'batch_action_error',
        data: { message: error.message || 'Failed to perform batch action' },
      });
    }
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.clients.forEach((client) => {
      client.close();
    });

    if (this.wss) {
      this.wss.close();
    }

    console.log('📡 WebSocket server closed');
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
