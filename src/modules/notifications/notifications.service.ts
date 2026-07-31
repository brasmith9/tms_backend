import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { BOOKING_STATUS_CHANGED } from '../bookings/booking-events';
import type { BookingStatusChangedEvent } from '../bookings/booking-events';
import { RIDE_STATUS_CHANGED } from '../rides/ride-events';
import type { RideStatusChangedEvent } from '../rides/ride-events';
import { Notification } from './entities/notification.entity';
import {
  NOTIFICATION_CREATED,
  NotificationCreatedEvent,
} from './notification-events';

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const BOOKING_COPY: Record<string, { title: string; verb: string }> = {
  PENDING: { title: 'Booking placed', verb: 'is awaiting payment' },
  CONFIRMED: { title: 'Booking confirmed', verb: 'is confirmed' },
  CANCELLED: { title: 'Booking cancelled', verb: 'was cancelled' },
  COMPLETED: { title: 'Trip completed', verb: 'is complete — leave a review!' },
};

const RIDE_COPY: Record<string, { title: string; body: string }> = {
  DRIVER_ASSIGNED: {
    title: 'Driver on the way',
    body: 'A driver is heading to your pickup.',
  },
  COMPLETED: { title: 'Ride complete', body: 'Thanks for riding with Voyago.' },
  CANCELLED: { title: 'Ride cancelled', body: 'Your ride was cancelled.' },
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const saved = await this.repo.save(this.repo.create(input));
    this.events.emit(NOTIFICATION_CREATED, {
      userId: saved.userId,
      id: saved.id,
      type: saved.type,
      title: saved.title,
      body: saved.body,
      read: saved.read,
      createdAt: saved.createdAt.toISOString(),
    } satisfies NotificationCreatedEvent);
    return saved;
  }

  async list(
    userId: string,
    q: PaginationQueryDto & { unreadOnly?: boolean },
  ): Promise<Paginated<Notification> & { unread: number }> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findAndCount({
      where: q.unreadOnly ? { userId, read: false } : { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    const unread = await this.repo.count({ where: { userId, read: false } });
    return { ...paginate(data, total, q), unread };
  }

  async markRead(userId: string, id: string): Promise<Notification> {
    const notification = await this.repo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    notification.read = true;
    return this.repo.save(notification);
  }

  async markAllRead(userId: string): Promise<number> {
    const { affected } = await this.repo.update(
      { userId, read: false },
      { read: true },
    );
    return affected ?? 0;
  }

  @OnEvent(BOOKING_STATUS_CHANGED)
  async onBookingStatus(event: BookingStatusChangedEvent): Promise<void> {
    const copy = BOOKING_COPY[event.status];
    if (!copy) return;
    await this.create({
      userId: event.userId,
      type: 'BOOKING',
      title: copy.title,
      body: `Booking ${event.reference} ${copy.verb}.`,
      data: { reference: event.reference, status: event.status },
    });
  }

  @OnEvent(RIDE_STATUS_CHANGED)
  async onRideStatus(event: RideStatusChangedEvent): Promise<void> {
    const copy = RIDE_COPY[event.status];
    if (!copy) return; // only notify on meaningful transitions, not every tick
    await this.create({
      userId: event.userId,
      type: 'RIDE',
      title: copy.title,
      body: copy.body,
      data: { rideId: event.rideId, status: event.status },
    });
  }
}
