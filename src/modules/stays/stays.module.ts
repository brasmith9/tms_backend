import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from '../reservations/reservations.module';
import { Room } from './entities/room.entity';
import { Stay } from './entities/stay.entity';
import { StaysController } from './stays.controller';
import { StaysRepository } from './stays.repository';
import { StaysService } from './stays.service';

@Module({
  imports: [TypeOrmModule.forFeature([Stay, Room]), ReservationsModule],
  controllers: [StaysController],
  providers: [StaysService, StaysRepository],
})
export class StaysModule {}
