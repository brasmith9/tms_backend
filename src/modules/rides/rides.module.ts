import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { Ride } from './entities/ride.entity';
import { RideQuote } from './entities/ride-quote.entity';
import { RidesController } from './rides.controller';
import { RidesGateway } from './rides.gateway';
import { RidesRepository } from './rides.repository';
import { RidesScheduler } from './rides.scheduler';
import { RidesService } from './rides.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Ride, RideQuote]),
    JwtModule.register({}),
  ],
  controllers: [RidesController],
  providers: [RidesService, RidesRepository, RidesGateway, RidesScheduler],
})
export class RidesModule {}
