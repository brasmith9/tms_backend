import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DestinationsRepository } from './destinations.repository';
import { DestinationsService } from './destinations.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

describe('DestinationsService', () => {
  let service: DestinationsService;
  let repo: {
    findAndCount: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findAndCount: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        DestinationsService,
        { provide: DestinationsRepository, useValue: repo },
      ],
    }).compile();
    service = module.get(DestinationsService);
  });

  it('returns a paginated envelope', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 'd1' }], 1]);
    const q = Object.assign(new PaginationQueryDto(), { page: 1, limit: 20 });
    const res = await service.findAll(q);
    expect(res.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    expect(res.data).toHaveLength(1);
  });

  it('throws NotFound for an unknown id', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
  });
});
