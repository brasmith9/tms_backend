import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Itinerary } from './entities/itinerary.entity';

@Injectable()
export class ItinerariesRepository {
  constructor(
    @InjectRepository(Itinerary)
    private readonly repo: Repository<Itinerary>,
  ) {}

  create(input: Partial<Itinerary>): Itinerary {
    return this.repo.create(input);
  }

  save(itinerary: Itinerary): Promise<Itinerary> {
    return this.repo.save(itinerary);
  }

  findByIdAndUser(id: string, userId: string): Promise<Itinerary | null> {
    return this.repo.findOne({ where: { id, userId } });
  }

  findAndCountByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[Itinerary[], number]> {
    return this.repo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async remove(itinerary: Itinerary): Promise<void> {
    await this.repo.remove(itinerary);
  }
}
