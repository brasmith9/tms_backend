import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Destination } from './entities/destination.entity';

@Injectable()
export class DestinationsRepository {
  constructor(
    @InjectRepository(Destination)
    private readonly repo: Repository<Destination>,
  ) {}

  findAndCount(skip: number, take: number): Promise<[Destination[], number]> {
    return this.repo.findAndCount({ skip, take, order: { name: 'ASC' } });
  }

  findById(id: string): Promise<Destination | null> {
    return this.repo.findOne({ where: { id } });
  }

  create(input: Partial<Destination>): Destination {
    return this.repo.create(input);
  }

  save(d: Destination): Promise<Destination> {
    return this.repo.save(d);
  }

  remove(d: Destination): Promise<Destination> {
    return this.repo.remove(d);
  }
}
