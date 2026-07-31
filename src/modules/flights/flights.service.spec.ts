import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ReservationType } from '../reservations/entities/reservation.entity';
import { ReservationsService } from '../reservations/reservations.service';
import { Cabin, Flight } from './entities/flight.entity';
import { FlightsRepository } from './flights.repository';
import { FlightsService } from './flights.service';
import { TripType } from './dto/search-flights.dto';

const flight = (over: Partial<Flight> = {}): Flight => ({
  id: 'f1',
  airlineCode: 'AW',
  airlineName: 'Africa World Airlines',
  origin: 'ACC',
  destination: 'LOS',
  departsAt: new Date('2026-09-10T08:30:00Z'),
  arrivesAt: new Date('2026-09-10T10:45:00Z'),
  flightNumber: 'AW301',
  durationMinutes: 135,
  stops: 0,
  refundable: true,
  amenities: ['Meal Included'],
  priceMinor: 85000,
  currency: 'GHS',
  seatsAvailable: 9,
  ...over,
});

describe('FlightsService', () => {
  let service: FlightsService;
  let repo: Record<string, jest.Mock>;
  let reservations: { create: jest.Mock };

  beforeEach(async () => {
    repo = {
      searchFlights: jest.fn(),
      findFlight: jest.fn(),
      createOffer: jest.fn((i) => i),
      saveOffer: jest.fn((o) => Promise.resolve({ id: 'offer1', ...o })),
      findOffer: jest.fn(),
    };
    reservations = {
      create: jest.fn((i) =>
        Promise.resolve({ reference: 'FLT-2026-0001', ...i }),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        FlightsService,
        { provide: FlightsRepository, useValue: repo },
        { provide: ReservationsService, useValue: reservations },
      ],
    }).compile();
    service = module.get(FlightsService);
  });

  const searchDto = (over = {}) => ({
    tripType: TripType.ONE_WAY,
    origin: 'ACC',
    destination: 'LOS',
    date: new Date('2026-09-10T00:00:00Z'),
    passengers: { adults: 2, children: 1, infants: 1 },
    cabin: Cabin.ECONOMY,
    ...over,
  });

  it('prices an offer by cabin fare × paying pax (infants free)', async () => {
    repo.searchFlights.mockResolvedValue([flight()]);
    const res = await service.search(searchDto());
    // economy 85000 × (2 adults + 1 child) = 255000 pesewas = GHS 2550
    expect(res.offers[0].total).toBe(2550);
    expect(res.offers).toHaveLength(1);
  });

  it('applies the business-cabin multiplier', async () => {
    repo.searchFlights.mockResolvedValue([flight()]);
    const res = await service.search(
      searchDto({ cabin: Cabin.BUSINESS, passengers: { adults: 1 } }),
    );
    // 85000 × 2.5 × 1 = 212500 pesewas = GHS 2125
    expect(res.offers[0].total).toBe(2125);
  });

  it('rejects booking an expired offer', async () => {
    repo.findOffer.mockResolvedValue({
      id: 'offer1',
      flightId: 'f1',
      totalMinor: 255000,
      currency: 'GHS',
      cabin: Cabin.ECONOMY,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.book('u1', 'offer1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('books a live offer as a PENDING flight reservation', async () => {
    repo.findOffer.mockResolvedValue({
      id: 'offer1',
      flightId: 'f1',
      totalMinor: 255000,
      currency: 'GHS',
      cabin: Cabin.ECONOMY,
      expiresAt: new Date(Date.now() + 60000),
    });
    repo.findFlight.mockResolvedValue(flight());
    const r = await service.book('u1', 'offer1');
    expect(reservations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ReservationType.FLIGHT,
        totalMinor: 255000,
      }),
    );
    expect(r.reference).toBe('FLT-2026-0001');
  });
});
