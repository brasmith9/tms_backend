import { BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { Driver } from './entities/driver.entity';
import { RidesRepository } from './rides.repository';
import { RidesService } from './rides.service';
import { RideStatus, VehicleType } from './ride.types';

const driver = (over: Partial<Driver> = {}): Driver => ({
  id: 'd1',
  name: 'Kwesi',
  phone: '+233200000000',
  rating: 4.9,
  vehicleType: VehicleType.TAXI,
  vehicleMake: 'Toyota',
  vehicleModel: 'Corolla',
  vehiclePlate: 'GR-1234-24',
  vehicleColor: 'Silver',
  lat: 5.561,
  lng: -0.201,
  available: true,
  ...over,
});

const pickup = { lat: 5.56, lng: -0.2, label: 'Airport' };
const dropoff = { lat: 5.6, lng: -0.18, label: 'Osu' };

describe('RidesService', () => {
  let service: RidesService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      saveQuote: jest.fn((q) => Promise.resolve({ id: 'q1', ...q })),
      createQuote: jest.fn((q) => q),
      findQuote: jest.fn(),
      availableDrivers: jest.fn(),
      findDriver: jest.fn(),
      saveDriver: jest.fn((d) => Promise.resolve(d)),
      createRide: jest.fn((r) => r),
      saveRide: jest.fn((r) => Promise.resolve({ id: 'r1', ...r })),
      findRide: jest.fn(),
      hasActiveRide: jest.fn().mockResolvedValue(false),
    };
    const module = await Test.createTestingModule({
      providers: [
        RidesService,
        { provide: RidesRepository, useValue: repo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(RidesService);
  });

  it('prices a taxi quote by base + per-km distance', async () => {
    const q = await service.quote({
      vehicleType: VehicleType.TAXI,
      pickup,
      dropoff,
    });
    // taxi base 1000 + 350/km × ~4.9km ≈ 2700+ pesewas
    expect(q.fareMinor).toBeGreaterThan(1000);
    expect(q.etaMinutes).toBeGreaterThan(0);
  });

  it('assigns the nearest available driver on request', async () => {
    repo.findQuote.mockResolvedValue({
      id: 'q1',
      vehicleType: VehicleType.TAXI,
      pickup,
      dropoff,
      fareMinor: 2700,
      currency: 'GHS',
      expiresAt: new Date(Date.now() + 60000),
    });
    repo.availableDrivers.mockResolvedValue([
      driver({ id: 'far', lat: 6.7, lng: -1.6 }),
      driver({ id: 'near', lat: 5.5605, lng: -0.2005 }),
    ]);
    const { ride, driver: assigned } = await service.request('u1', 'q1');
    expect(assigned.id).toBe('near');
    expect(ride.status).toBe(RideStatus.DRIVER_ASSIGNED);
    expect(assigned.available).toBe(false);
  });

  it('rejects requesting against an expired quote', async () => {
    repo.findQuote.mockResolvedValue({
      id: 'q1',
      vehicleType: VehicleType.TAXI,
      pickup,
      dropoff,
      fareMinor: 2700,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.request('u1', 'q1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a second concurrent ride', async () => {
    repo.hasActiveRide.mockResolvedValue(true);
    repo.findQuote.mockResolvedValue({
      id: 'q1',
      vehicleType: VehicleType.TAXI,
      pickup,
      dropoff,
      fareMinor: 2700,
      expiresAt: new Date(Date.now() + 60000),
    });
    await expect(service.request('u1', 'q1')).rejects.toThrow(
      ConflictException,
    );
  });
});
