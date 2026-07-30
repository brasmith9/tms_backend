import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToursModule } from '../tours/tours.module';
import { Itinerary } from './entities/itinerary.entity';
import { ItinerariesController } from './itineraries.controller';
import { ItinerariesRepository } from './itineraries.repository';
import { ItinerariesService } from './itineraries.service';
import { ITINERARY_PLANNER } from './itinerary-planner.port';
import { OpenRouterPlanner } from './openrouter.planner';

@Module({
  imports: [TypeOrmModule.forFeature([Itinerary]), ToursModule],
  controllers: [ItinerariesController],
  providers: [
    ItinerariesService,
    ItinerariesRepository,
    { provide: ITINERARY_PLANNER, useClass: OpenRouterPlanner },
  ],
})
export class ItinerariesModule {}
