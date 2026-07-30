import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from './entities/destination.entity';
import { DestinationsController } from './destinations.controller';
import { DestinationsRepository } from './destinations.repository';
import { DestinationsService } from './destinations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Destination])],
  controllers: [DestinationsController],
  providers: [DestinationsService, DestinationsRepository],
  exports: [DestinationsService],
})
export class DestinationsModule {}
