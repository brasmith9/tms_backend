import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservationType } from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { Room } from './entities/room.entity';
import { Stay } from './entities/stay.entity';
import { StaysRepository } from './stays.repository';
import { StaysService } from './stays.service';

const stay = (): Stay =>
  ({
    id: 's1',
    slug: 'labadi-beach',
    name: 'Labadi Beach Hotel',
    currency: 'GHS',
    heroImageUrl: 'x',
  }) as Stay;

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room1',
  stayId: 's1',
  name: 'Deluxe',
  maxGuests: 2,
  bed: 'King',
  pricePerNightMinor: 50000,
  available: true,
  ...over,
});

describe('StaysService', () => {
  let service: StaysService;
  let repo: Record<string, jest.Mock>;
  let reservations: { create: jest.Mock };

  beforeEach(async () => {
    repo = {
      search: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn().mockResolvedValue(stay()),
      roomsFor: jest.fn(),
      findRoom: jest.fn(),
    };
    reservations = {
      create: jest.fn((i) =>
        Promise.resolve({ reference: 'STY-2026-0001', ...i }),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        StaysService,
        { provide: StaysRepository, useValue: repo },
        { provide: ReservationsService, useValue: reservations },
      ],
    }).compile();
    service = module.get(StaysService);
  });

  it('prices a stay reservation by nights × room rate and starts it PENDING', async () => {
    repo.findRoom.mockResolvedValue(room());
    await service.book('u1', 's1', {
      roomId: 'room1',
      checkIn: new Date('2026-09-01T00:00:00Z'),
      checkOut: new Date('2026-09-04T00:00:00Z'), // 3 nights
      guests: 2,
    });
    expect(reservations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ReservationType.STAY,
        totalMinor: 150000, // 3 × 50000
      }),
    );
  });

  it('rejects a party larger than the room capacity', async () => {
    repo.findRoom.mockResolvedValue(room({ maxGuests: 2 }));
    await expect(
      service.book('u1', 's1', {
        roomId: 'room1',
        checkIn: new Date('2026-09-01T00:00:00Z'),
        checkOut: new Date('2026-09-02T00:00:00Z'),
        guests: 4,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a room from another stay', async () => {
    repo.findRoom.mockResolvedValue(room({ stayId: 'other' }));
    await expect(
      service.book('u1', 's1', {
        roomId: 'room1',
        checkIn: new Date('2026-09-01T00:00:00Z'),
        checkOut: new Date('2026-09-02T00:00:00Z'),
        guests: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects checkOut on or before checkIn', async () => {
    repo.findRoom.mockResolvedValue(room());
    await expect(
      service.book('u1', 's1', {
        roomId: 'room1',
        checkIn: new Date('2026-09-04T00:00:00Z'),
        checkOut: new Date('2026-09-01T00:00:00Z'),
        guests: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
