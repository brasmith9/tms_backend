import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { Ride } from './entities/ride.entity';
import { RideQuote } from './entities/ride-quote.entity';
import { RideStatus, VehicleType } from './ride.types';

const ACTIVE_STATUSES = [
  RideStatus.DRIVER_ASSIGNED,
  RideStatus.ARRIVING,
  RideStatus.IN_PROGRESS,
];

@Injectable()
export class RidesRepository {
  constructor(
    @InjectRepository(Driver) private readonly drivers: Repository<Driver>,
    @InjectRepository(Ride) private readonly rides: Repository<Ride>,
    @InjectRepository(RideQuote)
    private readonly quotes: Repository<RideQuote>,
  ) {}

  availableDrivers(vehicleType?: VehicleType): Promise<Driver[]> {
    return this.drivers.find({
      where: vehicleType
        ? { available: true, vehicleType }
        : { available: true },
    });
  }

  findDriver(id: string): Promise<Driver | null> {
    return this.drivers.findOne({ where: { id } });
  }

  saveDriver(driver: Driver): Promise<Driver> {
    return this.drivers.save(driver);
  }

  createQuote(input: Partial<RideQuote>): RideQuote {
    return this.quotes.create(input);
  }

  saveQuote(quote: RideQuote): Promise<RideQuote> {
    return this.quotes.save(quote);
  }

  findQuote(id: string): Promise<RideQuote | null> {
    return this.quotes.findOne({ where: { id } });
  }

  createRide(input: Partial<Ride>): Ride {
    return this.rides.create(input);
  }

  saveRide(ride: Ride): Promise<Ride> {
    return this.rides.save(ride);
  }

  findRide(id: string): Promise<Ride | null> {
    return this.rides.findOne({ where: { id } });
  }

  findMine(userId: string, status?: RideStatus): Promise<Ride[]> {
    return this.rides.find({
      where: status ? { userId, status } : { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Rides currently mid-trip, for the simulation tick. */
  activeRides(): Promise<Ride[]> {
    return this.rides.find({ where: { status: In(ACTIVE_STATUSES) } });
  }

  hasActiveRide(userId: string): Promise<boolean> {
    return this.rides.exists({
      where: { userId, status: In(ACTIVE_STATUSES) },
    });
  }

  countDrivers(): Promise<number> {
    return this.drivers.count();
  }

  seedDrivers(drivers: Driver[]): Promise<Driver[]> {
    return this.drivers.save(drivers);
  }

  createDriver(input: Partial<Driver>): Driver {
    return this.drivers.create(input);
  }
}
