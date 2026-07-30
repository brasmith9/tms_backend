import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import {
  PageMeta,
  applyPagination,
  paginated,
} from '../../common/pagination/paginate';
import { generateReference } from './booking-reference';
import { BookingsRepository } from './bookings.repository';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus, TourBooking } from './entities/tour-booking.entity';
import { TourDeparturesService } from '../tours/tour-departures.service';
import { ToursService } from '../tours/tours.service';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';

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
  ) {}

  /** SeatCounter port implementation consumed by TourDeparturesService. */
  seatsConsumed(departureId: string): Promise<number> {
    return this.repo.seatsConsumed(departureId);
  }

  async create(touristId: string, dto: CreateBookingDto): Promise<TourBooking> {
    return this.dataSource.transaction(async (manager) => {
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

      const consumed = await this.repo.seatsConsumed(dto.departureId, manager);
      if (consumed + dto.seats > departure.capacity) {
        throw new ConflictException(
          'Not enough seats remaining on this departure',
        );
      }

      const year = new Date().getUTCFullYear();
      const seq = (await this.repo.countForYear(year, manager)) + 1;
      const booking = this.repo.create(
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
      return this.repo.save(booking, manager);
    });
  }

  async cancel(reference: string, touristId: string): Promise<TourBooking> {
    return this.dataSource.transaction(async (manager) => {
      const booking = await this.repo.findByReference(reference, manager);
      if (!booking) {
        throw new NotFoundException(`Booking ${reference} not found`);
      }
      if (booking.touristId !== touristId) {
        throw new ForbiddenException('Not your booking');
      }
      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.CONFIRMED
      ) {
        throw new ConflictException(
          'Booking cannot be cancelled in its current state',
        );
      }
      const departure = await this.departures.lockAndGet(
        booking.departureId,
        manager,
      );
      const windowMs =
        this.config.get<BookingConfig>('booking')!.cancellationWindowHours *
        3600 *
        1000;
      if (departure && departure.departsAt.getTime() - Date.now() < windowMs) {
        throw new ConflictException('Cancellation window has closed');
      }
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      return this.repo.save(booking, manager);
    });
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
  ): Promise<{ data: TourBooking[]; meta: PageMeta }> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findMine(
      touristId,
      q.status,
      new Date(),
      skip,
      take,
    );
    return paginated(data, total, q);
  }
}
