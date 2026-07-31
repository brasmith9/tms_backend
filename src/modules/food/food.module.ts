import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsModule } from '../reservations/reservations.module';
import { Restaurant } from './entities/restaurant.entity';
import { FoodController } from './food.controller';
import { FoodRepository } from './food.repository';
import { FoodService } from './food.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant]), ReservationsModule],
  controllers: [FoodController],
  providers: [FoodService, FoodRepository],
})
export class FoodModule {}
