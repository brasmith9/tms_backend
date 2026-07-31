import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { Reservation, ReservationType } from './entities/reservation.entity';

@Injectable()
export class ReservationsRepository {
  constructor(
    @InjectRepository(Reservation)
    private readonly repo: Repository<Reservation>,
  ) {}

  private scoped(manager?: EntityManager): Repository<Reservation> {
    return manager ? manager.getRepository(Reservation) : this.repo;
  }

  create(input: Partial<Reservation>, manager?: EntityManager): Reservation {
    return this.scoped(manager).create(input);
  }

  save(r: Reservation, manager?: EntityManager): Promise<Reservation> {
    return this.scoped(manager).save(r);
  }

  findByReference(reference: string): Promise<Reservation | null> {
    return this.repo.findOne({ where: { reference } });
  }

  findMine(userId: string): Promise<Reservation[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Count of a type's reservations this year, for the reference sequence. */
  countForYear(
    type: ReservationType,
    year: number,
    manager: EntityManager,
  ): Promise<number> {
    return this.scoped(manager).count({
      where: {
        type,
        createdAt: Between(
          new Date(Date.UTC(year, 0, 1)),
          new Date(Date.UTC(year + 1, 0, 1)),
        ),
      },
    });
  }
}
