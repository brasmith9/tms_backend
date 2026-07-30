import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ToursRepository } from './tours.repository';
import { ToursService } from './tours.service';
import { DestinationsService } from '../destinations/destinations.service';
import { Tour, TourStatus } from './entities/tour.entity';

describe('ToursService', () => {
  let service: ToursService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      save: jest.fn((t: Tour) => Promise.resolve({ id: 't1', ...t })),
      create: jest.fn((t: Partial<Tour>) => t),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      searchApproved: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        ToursService,
        { provide: ToursRepository, useValue: repo },
        {
          provide: DestinationsService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: 'd1' }) },
        },
      ],
    }).compile();
    service = module.get(ToursService);
  });

  it('creates a tour in DRAFT with a slug derived from the title', async () => {
    const tour = await service.create('op1', {
      title: 'Kakum Canopy Walk',
      destinationId: 'd1',
      description: 'x',
      priceMinor: 12000,
      durationMinutes: 180,
    });
    expect(tour.status).toBe(TourStatus.DRAFT);
    expect(tour.slug).toMatch(/^kakum-canopy-walk/);
    expect(tour.operatorId).toBe('op1');
  });

  it('moves DRAFT to PENDING_REVIEW on submit', async () => {
    repo.findById.mockResolvedValue({
      id: 't1',
      operatorId: 'op1',
      status: TourStatus.DRAFT,
    });
    const tour = await service.submit('t1', 'op1');
    expect(tour.status).toBe(TourStatus.PENDING_REVIEW);
  });

  it('forbids submit by a non-owner', async () => {
    repo.findById.mockResolvedValue({
      id: 't1',
      operatorId: 'other',
      status: TourStatus.DRAFT,
    });
    await expect(service.submit('t1', 'op1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects approve unless the tour is PENDING_REVIEW', async () => {
    repo.findById.mockResolvedValue({ id: 't1', status: TourStatus.DRAFT });
    await expect(service.approve('t1')).rejects.toThrow(BadRequestException);
  });

  it('approves a tour that is pending review', async () => {
    repo.findById.mockResolvedValue({
      id: 't1',
      status: TourStatus.PENDING_REVIEW,
    });
    const tour = await service.approve('t1');
    expect(tour.status).toBe(TourStatus.APPROVED);
  });
});
