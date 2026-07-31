import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { authenticateSocket } from './ws-auth';
import { NOTIFICATION_CREATED } from './notification-events';
import type { NotificationCreatedEvent } from './notification-events';

/**
 * Pushes new notifications to their owner. On connect the client joins its own
 * `user:<id>` room automatically (authenticated handshake required).
 */
@WebSocketGateway({ cors: true, namespace: '/notifications' })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    const userId = authenticateSocket(client, this.jwt, this.config);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    void client.join(`user:${userId}`);
  }

  @OnEvent(NOTIFICATION_CREATED)
  onCreated(event: NotificationCreatedEvent): void {
    this.server.to(`user:${event.userId}`).emit(NOTIFICATION_CREATED, event);
  }
}
