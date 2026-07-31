import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { distanceKm } from '../../common/geo/haversine';
import {
  Paginated,
  applyPagination,
  paginate,
} from '../../common/pagination/paginate';
import {
  Reservation,
  ReservationType,
} from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { BookStayDto } from './dto/book-stay.dto';
import { StayQueryDto } from './dto/stay-query.dto';
import { StayResponseDto } from './dto/stay-response.dto';
import { Room } from './entities/room.entity';
import { Stay } from './entities/stay.entity';
import { StaysRepository } from './stays.repository';

const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

@Injectable()
export class StaysService {
  constructor(
    private readonly repo: StaysRepository,
    private readonly reservations: ReservationsService,
  ) {}

  async search(q: StayQueryDto): Promise<Paginated<StayResponseDto>> {
    const hasLocation = q.lat !== undefined && q.lng !== undefined;
    let rows = (await this.repo.search(q)).map((stay) => ({
      stay,
      distanceKm: hasLocation
        ? distanceKm(q.lat!, q.lng!, stay.lat, stay.lng)
        : undefined,
    }));

    if (q.guests !== undefined) {
      // keep only stays that have at least one room fitting the party
      const fitting = await Promise.all(
        rows.map(
          async (r) =>
            (await this.repo.roomsFor(r.stay.id, q.guests)).length > 0,
        ),
      );
      rows = rows.filter((_, i) => fitting[i]);
    }
    if (hasLocation) {
      rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    const { skip, take } = applyPagination(q);
    const page = rows.slice(skip, skip + take);
    return paginate(
      page.map((r) => StayResponseDto.from(r.stay, r.distanceKm)),
      rows.length,
      q,
    );
  }

  async findBySlug(slug: string): Promise<Stay> {
    const stay = await this.repo.findBySlug(slug);
    if (!stay) throw new NotFoundException(`Stay ${slug} not found`);
    return stay;
  }

  async rooms(id: string, minGuests?: number): Promise<Room[]> {
    await this.byIdOrThrow(id);
    return this.repo.roomsFor(id, minGuests);
  }

  /** Creates a PENDING stay reservation priced by nights × room rate. */
  async book(
    userId: string,
    id: string,
    dto: BookStayDto,
  ): Promise<Reservation> {
    const stay = await this.byIdOrThrow(id);
    const nights = this.nightsBetween(dto.checkIn, dto.checkOut);

    const room = await this.repo.findRoom(dto.roomId);
    if (!room || room.stayId !== id) {
      throw new BadRequestException('Room does not belong to this stay');
    }
    if (!room.available) {
      throw new BadRequestException('Room is not available');
    }
    if (dto.guests > room.maxGuests) {
      throw new BadRequestException('Party size exceeds the room capacity');
    }

    return this.reservations.create({
      userId,
      type: ReservationType.STAY,
      totalMinor: nights * room.pricePerNightMinor,
      currency: stay.currency,
      item: {
        id: stay.id,
        slug: stay.slug,
        title: stay.name,
        subtitle: `${room.name} · ${nights} night${nights > 1 ? 's' : ''} · ${dto.guests} guest${dto.guests > 1 ? 's' : ''}`,
        imageUrl: stay.heroImageUrl,
        startsAt: dto.checkIn.toISOString(),
        endsAt: dto.checkOut.toISOString(),
      },
    });
  }

  private nightsBetween(checkIn: Date, checkOut: Date): number {
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / MS_PER_NIGHT,
    );
    if (nights < 1) {
      throw new BadRequestException('checkOut must be after checkIn');
    }
    return nights;
  }

  private async byIdOrThrow(id: string): Promise<Stay> {
    const stay = await this.repo.findById(id);
    if (!stay) throw new NotFoundException(`Stay ${id} not found`);
    return stay;
  }
}
