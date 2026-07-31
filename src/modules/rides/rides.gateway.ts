import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { authenticateSocket } from '../notifications/ws-auth';
import { RIDE_DRIVER_MOVED, RIDE_STATUS_CHANGED } from './ride-events';
import type {
  RideDriverMovedEvent,
  RideStatusChangedEvent,
} from './ride-events';

/**
 * Live ride tracking. Clients authenticate the handshake, then subscribe to a
 * ride to receive its status changes and throttled driver-location updates.
 */
@WebSocketGateway({ cors: true, namespace: '/rides' })
export class RidesGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket): void {
    if (!authenticateSocket(client, this.jwt, this.config)) {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('ride.subscribe')
  subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { rideId: string },
  ): void {
    void client.join(`ride:${body.rideId}`);
  }

  @SubscribeMessage('ride.unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { rideId: string },
  ): void {
    void client.leave(`ride:${body.rideId}`);
  }

  @OnEvent(RIDE_STATUS_CHANGED)
  onStatusChanged(event: RideStatusChangedEvent): void {
    this.server.to(`ride:${event.rideId}`).emit(RIDE_STATUS_CHANGED, event);
  }

  @OnEvent(RIDE_DRIVER_MOVED)
  onDriverMoved(event: RideDriverMovedEvent): void {
    this.server.to(`ride:${event.rideId}`).emit(RIDE_DRIVER_MOVED, event);
  }
}
