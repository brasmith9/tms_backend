import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import type { AuthUser } from '../auth/auth-user.type';
import {
  BOOKING_STATUS_CHANGED,
  BookingStatusChangedEvent,
} from '../bookings/booking-events';
import {
  Reservation,
  ReservationItem,
  ReservationStatus,
  ReservationType,
} from './entities/reservation.entity';
import { reservationReference } from './reservation-reference';
import { ReservationsRepository } from './reservations.repository';

const PG_UNIQUE_VIOLATION = '23505';

export interface CreateReservationInput {
  userId: string;
  type: ReservationType;
  item: ReservationItem;
  totalMinor: number;
  currency?: string;
  /** Free reservations (e.g. a restaurant table) confirm immediately. */
  confirmImmediately?: boolean;
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly repo: ReservationsRepository,
    private readonly dataSource: DataSource,
    private readonly events: EventEmitter2,
  ) {}

  async create(input: CreateReservationInput): Promise<Reservation> {
    const status = input.confirmImmediately
      ? ReservationStatus.CONFIRMED
      : ReservationStatus.PENDING;
    const reservation = await this.saveWithReference(input, status);
    this.notifyStatusChanged(reservation);
    return reservation;
  }

  async findByReference(
    reference: string,
    requester: AuthUser,
  ): Promise<Reservation> {
    const reservation = await this.repo.findByReference(reference);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reference} not found`);
    }
    const privileged =
      requester.role === UserRole.ADMIN ||
      requester.role === UserRole.OPERATOR;
    if (reservation.userId !== requester.id && !privileged) {
      throw new ForbiddenException('Not permitted to view this reservation');
    }
    return reservation;
  }

  findMine(userId: string): Promise<Reservation[]> {
    return this.repo.findMine(userId);
  }

  async cancel(reference: string, userId: string): Promise<Reservation> {
    const reservation = await this.repo.findByReference(reference);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reference} not found`);
    }
    if (reservation.userId !== userId) {
      throw new ForbiddenException('Not your reservation');
    }
    if (
      reservation.status !== ReservationStatus.PENDING &&
      reservation.status !== ReservationStatus.CONFIRMED
    ) {
      throw new ConflictException(
        'Reservation cannot be cancelled in its current state',
      );
    }
    reservation.status = ReservationStatus.CANCELLED;
    reservation.cancelledAt = new Date();
    const saved = await this.repo.save(reservation);
    this.notifyStatusChanged(saved);
    return saved;
  }

  /** Marks a PENDING reservation CONFIRMED after payment; used by PaymentsService. */
  async confirmPaid(
    id: string,
    manager: EntityManager,
  ): Promise<Reservation> {
    const repo = manager.getRepository(Reservation);
    const reservation = await repo.findOne({ where: { id } });
    if (!reservation) throw new NotFoundException(`Reservation ${id} not found`);
    if (reservation.status === ReservationStatus.PENDING) {
      reservation.status = ReservationStatus.CONFIRMED;
      await repo.save(reservation);
    }
    return reservation;
  }

  notifyStatusChanged(reservation: Reservation): void {
    this.events.emit(BOOKING_STATUS_CHANGED, {
      userId: reservation.userId,
      reference: reservation.reference,
      status: reservation.status,
      changedAt: new Date().toISOString(),
    } satisfies BookingStatusChangedEvent);
  }

  /** Allocates a unique reference (retrying on the rare sequence collision). */
  private async saveWithReference(
    input: CreateReservationInput,
    status: ReservationStatus,
  ): Promise<Reservation> {
    const year = new Date().getUTCFullYear();
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const seq =
            (await this.repo.countForYear(input.type, year, manager)) + 1;
          const reservation = this.repo.create(
            {
              reference: reservationReference(input.type, seq, year),
              userId: input.userId,
              type: input.type,
              status,
              totalMinor: input.totalMinor,
              currency: input.currency ?? 'GHS',
              item: input.item,
            },
            manager,
          );
          return this.repo.save(reservation, manager);
        });
      } catch (err) {
        const isUnique =
          err instanceof QueryFailedError &&
          (err.driverError as { code?: string })?.code === PG_UNIQUE_VIOLATION;
        if (!isUnique || attempt === 3) throw err;
      }
    }
    // Unreachable: the loop returns or throws.
    throw new ConflictException('Could not allocate a reservation reference');
  }
}
