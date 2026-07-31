import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from '../reservations/reservations.module';
import { Flight } from './entities/flight.entity';
import { FlightOffer } from './entities/flight-offer.entity';
import { FlightsController } from './flights.controller';
import { FlightsRepository } from './flights.repository';
import { FlightsService } from './flights.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flight, FlightOffer]),
    ReservationsModule,
  ],
  controllers: [FlightsController],
  providers: [FlightsService, FlightsRepository],
})
export class FlightsModule {}
