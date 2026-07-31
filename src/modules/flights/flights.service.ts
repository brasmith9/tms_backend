import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  Reservation,
  ReservationType,
} from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { Airport, searchAirports } from './airports';
import { OfferResponseDto } from './dto/offer-response.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { CABIN_MULTIPLIER, Cabin, Flight } from './entities/flight.entity';
import { FlightOffer } from './entities/flight-offer.entity';
import { FlightsRepository } from './flights.repository';

const OFFER_TTL_MS = 20 * 60 * 1000;

export interface SearchResult {
  searchId: string;
  expiresAt: string;
  offers: OfferResponseDto[];
}

@Injectable()
export class FlightsService {
  constructor(
    private readonly repo: FlightsRepository,
    private readonly reservations: ReservationsService,
  ) {}

  airports(q?: string): Airport[] {
    return searchAirports(q);
  }

  /** Prices each matching flight for the party and persists a short-lived offer. */
  async search(dto: SearchFlightsDto): Promise<SearchResult> {
    const flights = await this.repo.searchFlights(
      dto.origin,
      dto.destination,
      dto.date,
    );
    const payingPax = dto.passengers.adults + (dto.passengers.children ?? 0);
    const expiresAt = new Date(Date.now() + OFFER_TTL_MS);

    const offers = await Promise.all(
      flights.map(async (flight) => {
        const offer = await this.repo.saveOffer(
          this.repo.createOffer({
            flightId: flight.id,
            cabin: dto.cabin,
            adults: dto.passengers.adults,
            children: dto.passengers.children ?? 0,
            infants: dto.passengers.infants ?? 0,
            totalMinor: this.fareMinor(flight, dto.cabin) * payingPax,
            currency: flight.currency,
            expiresAt,
          }),
        );
        return { offer, flight };
      }),
    );

    const dtos = this.sortOffers(
      offers.map(({ offer, flight }) => ({
        dto: OfferResponseDto.from(offer, flight),
        flight,
      })),
      dto.sort,
    );

    return {
      searchId: randomUUID(),
      expiresAt: expiresAt.toISOString(),
      offers: dtos,
    };
  }

  async getOffer(offerId: string): Promise<OfferResponseDto> {
    const { offer, flight } = await this.liveOffer(offerId);
    return OfferResponseDto.from(offer, flight);
  }

  /** Books an unexpired offer as a PENDING flight reservation. */
  async book(userId: string, offerId: string): Promise<Reservation> {
    const { offer, flight } = await this.liveOffer(offerId);
    return this.reservations.create({
      userId,
      type: ReservationType.FLIGHT,
      totalMinor: offer.totalMinor,
      currency: offer.currency,
      item: {
        id: flight.id,
        title: `${flight.origin} → ${flight.destination}`,
        subtitle: `${flight.airlineName} ${flight.flightNumber} · ${offer.cabin}`,
        startsAt: flight.departsAt.toISOString(),
        endsAt: flight.arrivesAt.toISOString(),
      },
    });
  }

  private async liveOffer(
    offerId: string,
  ): Promise<{ offer: FlightOffer; flight: Flight }> {
    const offer = await this.repo.findOffer(offerId);
    if (!offer) throw new NotFoundException(`Offer ${offerId} not found`);
    if (offer.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Offer has expired; please search again');
    }
    const flight = await this.repo.findFlight(offer.flightId);
    if (!flight) throw new NotFoundException('Flight no longer available');
    return { offer, flight };
  }

  private fareMinor(flight: Flight, cabin: Cabin): number {
    return Math.round(flight.priceMinor * CABIN_MULTIPLIER[cabin]);
  }

  private sortOffers(
    rows: { dto: OfferResponseDto; flight: Flight }[],
    sort?: string,
  ): OfferResponseDto[] {
    const cmp: Record<
      string,
      (a: (typeof rows)[0], b: (typeof rows)[0]) => number
    > = {
      price: (a, b) => a.dto.total - b.dto.total,
      '-price': (a, b) => b.dto.total - a.dto.total,
      departsAt: (a, b) =>
        a.flight.departsAt.getTime() - b.flight.departsAt.getTime(),
    };
    const sorted = [...rows].sort(cmp[sort ?? 'price'] ?? cmp.price);
    return sorted.map((r) => r.dto);
  }
}
