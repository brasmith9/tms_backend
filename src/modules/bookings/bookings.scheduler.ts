import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(private readonly bookings: BookingsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireHolds(): Promise<void> {
    const n = await this.bookings.expireStalePending();
    if (n > 0) this.logger.log(`Expired ${n} stale pending bookings`);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async completePastDepartures(): Promise<void> {
    const n = await this.bookings.markCompletedAndAward();
    if (n > 0) this.logger.log(`Completed ${n} bookings and awarded points`);
  }
}
