import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OWNER_RESOLVER,
  OwnershipGuard,
} from '../../common/guards/ownership.guard';
import { DestinationsModule } from '../destinations/destinations.module';
import { TourDeparture } from './entities/tour-departure.entity';
import { Tour } from './entities/tour.entity';
import { TourDeparturesRepository } from './tour-departures.repository';
import { TourDeparturesService } from './tour-departures.service';
import { ToursController } from './tours.controller';
import { ToursRepository } from './tours.repository';
import { ToursService } from './tours.service';

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
  ],
  exports: [ToursService, TourDeparturesService],
})
export class ToursModule {}
