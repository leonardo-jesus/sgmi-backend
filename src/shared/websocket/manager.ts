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

  public attachToServer(server: Server, path: string = '/ws'): void {
    this.wss = new WebSocketServer({
      server,
      path,
      verifyClient: this.verifyClient.bind(this),
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

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

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
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
