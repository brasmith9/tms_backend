import { OnEvent } from '@nestjs/event-emitter';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConnectedSocket } from '@nestjs/websockets';
import {
  AVAILABILITY_CHANGED,
  AvailabilityChangedEvent,
} from '../bookings/booking-events';

/**
 * Broadcasts remaining-seat changes on a departure. Clients opt in per
 * departure via `departure.subscribe` and leave via `departure.unsubscribe`.
 */
@WebSocketGateway({ cors: true, namespace: '/availability' })
export class AvailabilityGateway {
  @WebSocketServer() server!: Server;

  @SubscribeMessage('departure.subscribe')
  subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { departureId: string },
  ): void {
    void client.join(`departure:${body.departureId}`);
  }

  @SubscribeMessage('departure.unsubscribe')
  unsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { departureId: string },
  ): void {
    void client.leave(`departure:${body.departureId}`);
  }

  @OnEvent(AVAILABILITY_CHANGED)
  onAvailabilityChanged(event: AvailabilityChangedEvent): void {
    this.emitAvailability(event.departureId, event);
  }

  emitAvailability(
    departureId: string,
    payload: AvailabilityChangedEvent,
  ): void {
    this.server.to(`departure:${departureId}`).emit(AVAILABILITY_CHANGED, {
      departureId: payload.departureId,
      seatsLeft: payload.seatsLeft,
      capacity: payload.capacity,
    });
  }
}
