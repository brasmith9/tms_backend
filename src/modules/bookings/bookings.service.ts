import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import { generateReference } from './booking-reference';
import {
  AVAILABILITY_CHANGED,
  BOOKING_CANCELLED,
  BOOKING_STATUS_CHANGED,
  AvailabilityChangedEvent,
  BookingCancelledEvent,
  BookingStatusChangedEvent,
} from './booking-events';
import { BookingsRepository } from './bookings.repository';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { ToursService } from '../tours/tours.service';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

type BookingConfig = {
  seatHoldMinutes: number;
  cancellationWindowHours: number;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly repo: BookingsRepository,
    private readonly departures: TourDeparturesService,
    private readonly tours: ToursService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
    private readonly users: UsersService,
  ) {}

  /** SeatCounter port implementation consumed by TourDeparturesService. */
  seatsConsumed(departureId: string): Promise<number> {
    return this.repo.seatsConsumed(departureId);
  }

  async create(touristId: string, dto: CreateBookingDto): Promise<TourBooking> {
    const { booking, capacity } = await this.dataSource.transaction(
      async (manager) => {
        // Lock the departure row so concurrent bookings serialise per departure.
        const departure = await this.departures.lockAndGet(
          dto.departureId,
          manager,
        );
        if (!departure) throw new NotFoundException('Departure not found');

        const tour = await this.tours.findApprovedForDeparture(
          departure.tourId,
          manager,
        );

        const consumed = await this.repo.seatsConsumed(
          dto.departureId,
          manager,
        );
        if (consumed + dto.seats > departure.capacity) {
          throw new ConflictException(
            'Not enough seats remaining on this departure',
          );
        }

        const year = new Date().getUTCFullYear();
        const seq = (await this.repo.countForYear(year, manager)) + 1;
        const created = this.repo.create(
          {
            reference: generateReference(seq, year),
            touristId,
            departureId: dto.departureId,
            seats: dto.seats,
            unitPriceMinor: tour.priceMinor,
            totalMinor: tour.priceMinor * dto.seats,
            currency: tour.currency,
            status: BookingStatus.PENDING,
          },
          manager,
        );
        const saved = await this.repo.save(created, manager);
        return { booking: saved, capacity: departure.capacity };
      },
    );

    await this.emitBookingEvents(booking, capacity);
    return booking;
  }

  /** Push a booking status change to the owner (no seat-count change). */
  notifyStatusChanged(booking: TourBooking): void {
    this.events.emit(BOOKING_STATUS_CHANGED, {
      userId: booking.touristId,
      reference: booking.reference,
      status: booking.status,
      changedAt: new Date().toISOString(),
    } satisfies BookingStatusChangedEvent);
  }

  /** Emit status + availability events after a booking's seat state changes. */
  async emitBookingEvents(
    booking: TourBooking,
    capacity: number,
  ): Promise<void> {
    this.notifyStatusChanged(booking);
    const consumed = await this.repo.seatsConsumed(booking.departureId);
    this.events.emit(AVAILABILITY_CHANGED, {
      departureId: booking.departureId,
      seatsLeft: capacity - consumed,
      capacity,
    } satisfies AvailabilityChangedEvent);
  }

  async cancel(reference: string, touristId: string): Promise<TourBooking> {
    const { booking, capacity } = await this.dataSource.transaction(
      async (manager) => {
        const found = await this.repo.findByReference(reference, manager);
        if (!found) {
          throw new NotFoundException(`Booking ${reference} not found`);
        }
        if (found.touristId !== touristId) {
          throw new ForbiddenException('Not your booking');
        }
        if (
          found.status !== BookingStatus.PENDING &&
          found.status !== BookingStatus.CONFIRMED
        ) {
          throw new ConflictException(
            'Booking cannot be cancelled in its current state',
          );
        }
        const departure = await this.departures.lockAndGet(
          found.departureId,
          manager,
        );
        const windowMs =
          this.config.get<BookingConfig>('booking')!.cancellationWindowHours *
          3600 *
          1000;
        if (
          departure &&
          departure.departsAt.getTime() - Date.now() < windowMs
        ) {
          throw new ConflictException('Cancellation window has closed');
        }
        found.status = BookingStatus.CANCELLED;
        found.cancelledAt = new Date();
        const saved = await this.repo.save(found, manager);
        return { booking: saved, capacity: departure?.capacity ?? 0 };
      },
    );

    // Emitted after commit so a rolled-back cancellation never triggers a refund.
    this.events.emit(BOOKING_CANCELLED, {
      bookingId: booking.id,
      reference: booking.reference,
    } satisfies BookingCancelledEvent);
    await this.emitBookingEvents(booking, capacity);
    return booking;
  }

  /** Called by PaymentsService inside its transaction after a successful charge. */
  async confirmPaid(
    bookingId: string,
    manager: EntityManager,
  ): Promise<TourBooking> {
    const booking = await this.repo.findById(bookingId, manager);
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);
    if (booking.status === BookingStatus.PENDING) {
      booking.status = BookingStatus.CONFIRMED;
      await this.repo.save(booking, manager);
    }
    return booking;
  }

  async findByReference(
    reference: string,
    requester: AuthUser,
  ): Promise<TourBooking> {
    const booking = await this.repo.findByReference(reference);
    if (!booking) {
      throw new NotFoundException(`Booking ${reference} not found`);
    }
    const isOwner = booking.touristId === requester.id;
    const isPrivileged =
      requester.role === UserRole.ADMIN || requester.role === UserRole.OPERATOR;
    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('Not permitted to view this booking');
    }
    return booking;
  }

  async findMine(
    touristId: string,
    q: BookingQueryDto,
  ): Promise<Paginated<TourBooking>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findMine(
      touristId,
      q.status,
      new Date(),
      skip,
      take,
    );
    return paginate(data, total, q);
  }

  /** Cancel unpaid PENDING bookings past the seat-hold window. Returns the count. */
  async expireStalePending(): Promise<number> {
    const holdMinutes =
      this.config.get<BookingConfig>('booking')!.seatHoldMinutes;
    const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);
    return this.dataSource.transaction(async (manager) => {
      const stale = await this.repo.findExpiredPending(cutoff, manager);
      for (const booking of stale) {
        booking.status = BookingStatus.CANCELLED;
        booking.cancelledAt = new Date();
        await this.repo.save(booking, manager);
      }
      return stale.length;
    });
  }

  /** Mark CONFIRMED bookings on past departures COMPLETED and award loyalty points. */
  async markCompletedAndAward(): Promise<number> {
    const pastDepartures = await this.departures.findPast(new Date());
    if (pastDepartures.length === 0) return 0;
    const departureIds = pastDepartures.map((d) => d.id);

    return this.dataSource.transaction(async (manager) => {
      const rows = await this.repo.findConfirmedForDepartures(
        departureIds,
        manager,
      );
      for (const booking of rows) {
        booking.status = BookingStatus.COMPLETED;
        await this.repo.save(booking, manager);
        // 1 loyalty point per GHS 10 spent (1000 pesewas).
        const points = Math.floor(booking.totalMinor / 1000);
        if (points > 0) {
          await this.users.addLoyaltyPoints(booking.touristId, points, manager);
        }
      }
      return rows.length;
    });
  }
}
