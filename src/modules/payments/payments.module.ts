import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingsModule } from '../bookings/bookings.module';
import { UsersModule } from '../users/users.module';
import { Payment } from './entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaystackClient } from './paystack.client';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), BookingsModule, UsersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, PaystackClient],
  exports: [PaymentsService],
})
export class PaymentsModule {}
