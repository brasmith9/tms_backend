import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DestinationsModule } from './modules/destinations/destinations.module';
import { ToursModule } from './modules/tours/tours.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    DestinationsModule,
    ToursModule,
    BookingsModule,
  ],
})
export class AppModule {}
