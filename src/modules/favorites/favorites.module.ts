import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from '../destinations/entities/destination.entity';
import { Restaurant } from '../food/entities/restaurant.entity';
import { Stay } from '../stays/entities/stay.entity';
import { Tour } from '../tours/entities/tour.entity';
import { Favorite } from './entities/favorite.entity';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite, Tour, Stay, Restaurant, Destination]),
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
