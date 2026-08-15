import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { DestinationsModule } from './modules/destinations/destinations.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { FlightsModule } from './modules/flights/flights.module';
import { FoodModule } from './modules/food/food.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { ItinerariesModule } from './modules/itineraries/itineraries.module';
import { LocationsModule } from './modules/locations/locations.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { RidesModule } from './modules/rides/rides.module';
import { StaysModule } from './modules/stays/stays.module';
import { ToursModule } from './modules/tours/tours.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    MailModule,
    UsersModule,
    AuthModule,
    DestinationsModule,
    ToursModule,
    ReservationsModule,
    BookingsModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    UploadsModule,
    ItinerariesModule,
    EmergencyModule,
    FoodModule,
    StaysModule,
    FlightsModule,
    RidesModule,
    FavoritesModule,
    ReferenceModule,
    LocationsModule,
    AssistantModule,
  ],
})
export class AppModule {}
