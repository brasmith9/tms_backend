import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  BOOKING_STATUS_CHANGED,
  BookingStatusChangedEvent,
} from '../bookings/booking-events';
import { authenticateSocket } from './ws-auth';

/**
 * Pushes booking status changes to the owning tourist. Clients join the
 * `user:<id>` room automatically once their handshake token is verified.
 */
@WebSocketGateway({ cors: true, namespace: '/bookings' })
export class BookingsGateway implements OnGatewayConnection {
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

  @OnEvent(BOOKING_STATUS_CHANGED)
  onStatusChanged(event: BookingStatusChangedEvent): void {
    this.emitStatusChanged(event.userId, event);
  }

  emitStatusChanged(userId: string, payload: BookingStatusChangedEvent): void {
    this.server.to(`user:${userId}`).emit(BOOKING_STATUS_CHANGED, {
      reference: payload.reference,
      status: payload.status,
      changedAt: payload.changedAt,
    });
  }
}
