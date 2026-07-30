import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { TourDeparture } from './entities/tour-departure.entity';
import { TourDeparturesRepository } from './tour-departures.repository';
import { ToursService } from './tours.service';
import { SEAT_COUNTER } from './seat-counter';
import type { SeatCounter } from './seat-counter';

@Injectable()
export class TourDeparturesService {
  constructor(
    private readonly repo: TourDeparturesRepository,
    private readonly tours: ToursService,
    @Inject(SEAT_COUNTER) private readonly seatCounter: SeatCounter,
  ) {}

  async create(
    tourId: string,
    operatorId: string,
    dto: CreateDepartureDto,
  ): Promise<TourDeparture> {
    await this.tours.assertOwnedBy(tourId, operatorId); // 404 then 403
    return this.repo.save(this.repo.create({ tourId, ...dto }));
  }

  async listForTour(
    tourId: string,
  ): Promise<Array<{ departure: TourDeparture; seatsLeft: number }>> {
    const departures = await this.repo.listForTour(tourId);
    return Promise.all(
      departures.map(async (departure) => ({
        departure,
        seatsLeft: await this.seatsLeft(departure),
      })),
    );
  }

  async seatsLeft(departure: TourDeparture): Promise<number> {
    const consumed = await this.seatCounter.seatsConsumed(departure.id);
    return departure.capacity - consumed;
  }

  lockAndGet(
    id: string,
    manager: EntityManager,
  ): Promise<TourDeparture | null> {
    return this.repo.lockAndGet(id, manager);
  }

  findPast(now: Date): Promise<TourDeparture[]> {
    return this.repo.findPast(now);
  }
}
