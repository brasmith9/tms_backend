import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flight } from './entities/flight.entity';
import { FlightOffer } from './entities/flight-offer.entity';

@Injectable()
export class FlightsRepository {
  constructor(
    @InjectRepository(Flight) private readonly flights: Repository<Flight>,
    @InjectRepository(FlightOffer)
    private readonly offers: Repository<FlightOffer>,
  ) {}

  /** Bookable flights on a route departing on the given UTC date. */
  searchFlights(
    origin: string,
    destination: string,
    date: Date,
  ): Promise<Flight[]> {
    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    return this.flights
      .createQueryBuilder('f')
      .where('f.origin = :origin', { origin: origin.toUpperCase() })
      .andWhere('f.destination = :destination', {
        destination: destination.toUpperCase(),
      })
      .andWhere('f.departs_at >= :dayStart AND f.departs_at < :dayEnd', {
        dayStart,
        dayEnd,
      })
      .andWhere('f.seats_available > 0')
      .orderBy('f.departs_at', 'ASC')
      .getMany();
  }

  findFlight(id: string): Promise<Flight | null> {
    return this.flights.findOne({ where: { id } });
  }

  createOffer(input: Partial<FlightOffer>): FlightOffer {
    return this.offers.create(input);
  }

  saveOffer(offer: FlightOffer): Promise<FlightOffer> {
    return this.offers.save(offer);
  }

  findOffer(id: string): Promise<FlightOffer | null> {
    return this.offers.findOne({ where: { id } });
  }

  /** Sample flights within a future window, for seeding demo availability. */
  countFlights(): Promise<number> {
    return this.flights.count();
  }

  saveFlights(flights: Flight[]): Promise<Flight[]> {
    return this.flights.save(flights);
  }

  createFlight(input: Partial<Flight>): Flight {
    return this.flights.create(input);
  }
}
