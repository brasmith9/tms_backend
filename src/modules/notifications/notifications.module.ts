import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityGateway } from './availability.gateway';
import { BookingsGateway } from './bookings.gateway';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    BookingsGateway,
    AvailabilityGateway,
    NotificationsGateway,
    NotificationsService,
  ],
})
export class NotificationsModule {}
