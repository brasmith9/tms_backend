import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SEAT_COUNTER } from '../tours/seat-counter';
import { ToursModule } from '../tours/tours.module';
import { UsersModule } from '../users/users.module';
import { BookingsController } from './bookings.controller';
import { BookingsRepository } from './bookings.repository';
import { BookingsService } from './bookings.service';
import { TourBooking } from './entities/tour-booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TourBooking]), ToursModule, UsersModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    BookingsRepository,
    // Fulfils the SEAT_COUNTER port that TourDeparturesService resolves lazily.
    { provide: SEAT_COUNTER, useExisting: BookingsService },
  ],
  exports: [BookingsService, SEAT_COUNTER],
})
export class BookingsModule {}
