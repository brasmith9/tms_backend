import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { distanceKm } from '../../common/geo/haversine';
import { QuoteRideDto } from './dto/quote-ride.dto';
import { Driver } from './entities/driver.entity';
import { Ride } from './entities/ride.entity';
import { RideQuote } from './entities/ride-quote.entity';
import {
  RIDE_DRIVER_MOVED,
  RIDE_STATUS_CHANGED,
  RideDriverMovedEvent,
  RideStatusChangedEvent,
} from './ride-events';
import { FARE_TABLE, GeoPoint, RideStatus, VehicleType } from './ride.types';
import { RidesRepository } from './rides.repository';

const QUOTE_TTL_MS = 10 * 60 * 1000;
const KM_PER_MIN = 0.5; // ~30 km/h city driving
const ARRIVED_KM = 0.25;
const STEP_FRACTION = 0.4; // compress the sim so a demo ride finishes in a few ticks

const minutesFor = (km: number): number =>
  Math.max(1, Math.ceil(km / KM_PER_MIN));

@Injectable()
export class RidesService {
  constructor(
    private readonly repo: RidesRepository,
    private readonly events: EventEmitter2,
  ) {}

  async quote(dto: QuoteRideDto): Promise<RideQuote> {
    const km = distanceKm(
      dto.pickup.lat,
      dto.pickup.lng,
      dto.dropoff.lat,
      dto.dropoff.lng,
    );
    const table = FARE_TABLE[dto.vehicleType];
    const surge = 1;
    const fareMinor = Math.round(
      (table.baseMinor + table.perKmMinor * km) * surge,
    );
    return this.repo.saveQuote(
      this.repo.createQuote({
        vehicleType: dto.vehicleType,
        pickup: dto.pickup,
        dropoff: dto.dropoff,
        fareMinor,
        etaMinutes: minutesFor(km),
        surgeMultiplier: surge,
        scheduledAt: dto.scheduledAt,
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS),
      }),
    );
  }

  async nearbyDrivers(
    point: { lat: number; lng: number },
    vehicleType?: VehicleType,
  ): Promise<{ driver: Driver; etaMinutes: number }[]> {
    const drivers = await this.repo.availableDrivers(vehicleType);
    return drivers
      .map((driver) => ({
        driver,
        km: distanceKm(point.lat, point.lng, driver.lat, driver.lng),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 6)
      .map(({ driver, km }) => ({ driver, etaMinutes: minutesFor(km) }));
  }

  /** Creates a ride from a live quote and dispatches the nearest driver. */
  async request(
    userId: string,
    quoteId: string,
  ): Promise<{ ride: Ride; driver: Driver }> {
    const quote = await this.repo.findQuote(quoteId);
    if (!quote) throw new NotFoundException(`Quote ${quoteId} not found`);
    if (quote.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Quote has expired; request a new one');
    }
    if (await this.repo.hasActiveRide(userId)) {
      throw new ConflictException('You already have an active ride');
    }

    const nearest = await this.nearestDriver(quote.pickup, quote.vehicleType);
    if (!nearest) {
      throw new ServiceUnavailableException(
        'No drivers available right now; please try again shortly',
      );
    }

    let ride = this.repo.createRide({
      userId,
      status: RideStatus.DRIVER_ASSIGNED,
      vehicleType: quote.vehicleType,
      pickup: quote.pickup,
      dropoff: quote.dropoff,
      fareMinor: quote.fareMinor,
      currency: quote.currency,
      scheduledAt: quote.scheduledAt,
      driverId: nearest.driver.id,
      driverLat: nearest.driver.lat,
      driverLng: nearest.driver.lng,
      etaMinutes: nearest.etaMinutes,
    });
    ride = await this.repo.saveRide(ride);

    nearest.driver.available = false;
    await this.repo.saveDriver(nearest.driver);

    this.emitStatus(ride);
    this.emitMovement(ride, 0);
    return { ride, driver: nearest.driver };
  }

  async getRide(
    userId: string,
    id: string,
  ): Promise<{ ride: Ride; driver: Driver | null }> {
    const ride = await this.ownedRide(userId, id);
    const driver = ride.driverId
      ? await this.repo.findDriver(ride.driverId)
      : null;
    return { ride, driver };
  }

  async cancel(userId: string, id: string): Promise<Ride> {
    const ride = await this.ownedRide(userId, id);
    if (
      ride.status === RideStatus.COMPLETED ||
      ride.status === RideStatus.CANCELLED
    ) {
      throw new ConflictException('Ride can no longer be cancelled');
    }
    ride.status = RideStatus.CANCELLED;
    await this.freeDriver(ride);
    const saved = await this.repo.saveRide(ride);
    this.emitStatus(saved);
    return saved;
  }

  findMine(userId: string, status?: RideStatus): Promise<Ride[]> {
    return this.repo.findMine(userId, status);
  }

  driverFor(id?: string): Promise<Driver | null> {
    return id ? this.repo.findDriver(id) : Promise.resolve(null);
  }

  /**
   * Advances every in-flight ride one simulation step: moves the driver toward
   * its current target, transitions state on arrival, and emits movement. Called
   * by the scheduler. (Stands in for a real driver app pushing GPS.)
   */
  async advanceActiveRides(): Promise<void> {
    for (const ride of await this.repo.activeRides()) {
      await this.step(ride);
    }
  }

  private async step(ride: Ride): Promise<void> {
    const headingToDropoff = ride.status === RideStatus.IN_PROGRESS;
    const target = headingToDropoff ? ride.dropoff : ride.pickup;
    const from = { lat: ride.driverLat!, lng: ride.driverLng! };
    const next = this.moveToward(from, target, STEP_FRACTION);
    const remaining = distanceKm(next.lat, next.lng, target.lat, target.lng);

    ride.driverLat = next.lat;
    ride.driverLng = next.lng;
    ride.etaMinutes = minutesFor(remaining);
    const bearing = this.bearing(from, next);

    let statusChanged = false;
    if (remaining <= ARRIVED_KM) {
      if (headingToDropoff) {
        ride.status = RideStatus.COMPLETED;
        ride.completedAt = new Date();
        await this.freeDriver(ride);
        statusChanged = true;
      } else {
        ride.status = RideStatus.IN_PROGRESS;
        ride.startedAt = new Date();
        statusChanged = true;
      }
    } else if (ride.status === RideStatus.DRIVER_ASSIGNED) {
      ride.status = RideStatus.ARRIVING;
      statusChanged = true;
    }

    const saved = await this.repo.saveRide(ride);
    if (statusChanged) this.emitStatus(saved);
    if (saved.status !== RideStatus.COMPLETED)
      this.emitMovement(saved, bearing);
  }

  private async nearestDriver(
    point: GeoPoint,
    vehicleType: VehicleType,
  ): Promise<{ driver: Driver; etaMinutes: number } | null> {
    const [nearest] = await this.nearbyDrivers(point, vehicleType);
    return nearest ?? null;
  }

  private async ownedRide(userId: string, id: string): Promise<Ride> {
    const ride = await this.repo.findRide(id);
    if (!ride) throw new NotFoundException(`Ride ${id} not found`);
    if (ride.userId !== userId) throw new ForbiddenException('Not your ride');
    return ride;
  }

  private async freeDriver(ride: Ride): Promise<void> {
    if (!ride.driverId) return;
    const driver = await this.repo.findDriver(ride.driverId);
    if (driver) {
      driver.available = true;
      await this.repo.saveDriver(driver);
    }
  }

  private emitStatus(ride: Ride): void {
    this.events.emit(RIDE_STATUS_CHANGED, {
      rideId: ride.id,
      status: ride.status,
      changedAt: new Date().toISOString(),
    } satisfies RideStatusChangedEvent);
  }

  private emitMovement(ride: Ride, bearing: number): void {
    this.events.emit(RIDE_DRIVER_MOVED, {
      rideId: ride.id,
      lat: ride.driverLat!,
      lng: ride.driverLng!,
      bearing,
      etaMinutes: ride.etaMinutes ?? 0,
    } satisfies RideDriverMovedEvent);
  }

  private moveToward(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    fraction: number,
  ): { lat: number; lng: number } {
    return {
      lat: from.lat + (to.lat - from.lat) * fraction,
      lng: from.lng + (to.lng - from.lng) * fraction,
    };
  }

  private bearing(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const deg =
      (Math.atan2(to.lng - from.lng, to.lat - from.lat) * 180) / Math.PI;
    return Math.round((deg + 360) % 360);
  }
}
