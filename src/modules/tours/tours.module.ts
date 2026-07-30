import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OWNER_RESOLVER,
  OwnershipGuard,
} from '../../common/guards/ownership.guard';
import { DestinationsModule } from '../destinations/destinations.module';
import { TourDeparture } from './entities/tour-departure.entity';
import { Tour } from './entities/tour.entity';
import { SEAT_COUNTER, SeatCounter } from './seat-counter';
import { TourDeparturesRepository } from './tour-departures.repository';
import { TourDeparturesService } from './tour-departures.service';
import { ToursController } from './tours.controller';
import { ToursRepository } from './tours.repository';
import { ToursService } from './tours.service';

/**
 * Placeholder seat counter until the bookings module is wired in (Task 7).
 * With zero seats consumed, seatsLeft reports full capacity.
 */
const placeholderSeatCounter: SeatCounter = {
  seatsConsumed: () => Promise.resolve(0),
};

@Module({
  imports: [
    TypeOrmModule.forFeature([Tour, TourDeparture]),
    DestinationsModule,
  ],
  controllers: [ToursController],
  providers: [
    ToursService,
    ToursRepository,
    TourDeparturesService,
    TourDeparturesRepository,
    OwnershipGuard,
    { provide: OWNER_RESOLVER, useExisting: ToursService },
    { provide: SEAT_COUNTER, useValue: placeholderSeatCounter },
  ],
  exports: [ToursService, TourDeparturesService],
})
export class ToursModule {}
