import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import {
  DepartureStatus,
  TourDeparture,
} from './entities/tour-departure.entity';

@Injectable()
export class TourDeparturesRepository {
  constructor(
    @InjectRepository(TourDeparture)
    private readonly repo: Repository<TourDeparture>,
  ) {}

  create(input: Partial<TourDeparture>): TourDeparture {
    return this.repo.create(input);
  }

  save(d: TourDeparture): Promise<TourDeparture> {
    return this.repo.save(d);
  }

  findById(id: string): Promise<TourDeparture | null> {
    return this.repo.findOne({ where: { id } });
  }

  listForTour(tourId: string): Promise<TourDeparture[]> {
    return this.repo.find({
      where: { tourId },
      order: { departsAt: 'ASC' },
    });
  }

  /** Lock the departure row FOR UPDATE inside the caller's transaction. */
  lockAndGet(
    id: string,
    manager: EntityManager,
  ): Promise<TourDeparture | null> {
    return manager.getRepository(TourDeparture).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  findPast(now: Date): Promise<TourDeparture[]> {
    return this.repo.find({
      where: { departsAt: LessThan(now), status: DepartureStatus.SCHEDULED },
    });
  }
}
