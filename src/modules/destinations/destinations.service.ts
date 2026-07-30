import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  applyPagination,
  paginate,
  Paginated,
} from '../../common/pagination/paginate';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { Destination } from './entities/destination.entity';
import { DestinationsRepository } from './destinations.repository';

@Injectable()
export class DestinationsService {
  constructor(private readonly repo: DestinationsRepository) {}

  async findAll(q: PaginationQueryDto): Promise<Paginated<Destination>> {
    const { skip, take } = applyPagination(q);
    const [data, total] = await this.repo.findAndCount(skip, take);
    return paginate(data, total, q);
  }

  async findOne(id: string): Promise<Destination> {
    const d = await this.repo.findById(id);
    if (!d) throw new NotFoundException(`Destination ${id} not found`);
    return d;
  }

  create(dto: CreateDestinationDto): Promise<Destination> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateDestinationDto): Promise<Destination> {
    const d = await this.findOne(id);
    Object.assign(d, dto);
    return this.repo.save(d);
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(await this.findOne(id));
  }
}
