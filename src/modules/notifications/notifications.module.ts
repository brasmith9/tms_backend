import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AvailabilityGateway } from './availability.gateway';
import { BookingsGateway } from './bookings.gateway';

@Module({
  imports: [JwtModule.register({})],
  providers: [BookingsGateway, AvailabilityGateway],
})
export class NotificationsModule {}
