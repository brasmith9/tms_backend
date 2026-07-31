import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RidesService } from './rides.service';

/**
 * Drives the ride simulation: every few seconds it advances active rides toward
 * their target and emits driver movement. Throttled to one tick / 4s so we don't
 * stream raw GPS. Stands in for a real driver app.
 */
@Injectable()
export class RidesScheduler {
  private readonly logger = new Logger(RidesScheduler.name);

  constructor(private readonly rides: RidesService) {}

  @Interval(4000)
  async tick(): Promise<void> {
    try {
      await this.rides.advanceActiveRides();
    } catch (err) {
      this.logger.error(
        `ride tick failed: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }
}
