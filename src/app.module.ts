import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DestinationsModule } from './modules/destinations/destinations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ToursModule } from './modules/tours/tours.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    UsersModule,
    AuthModule,
    DestinationsModule,
    ToursModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
  ],
})
export class AppModule {}
