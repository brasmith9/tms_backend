import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { EmergencyContactsController } from './emergency-contacts.controller';
import { EmergencyController } from './emergency.controller';
import { EmergencyRepository } from './emergency.repository';
import { EmergencyService } from './emergency.service';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { MedicalFacility } from './entities/medical-facility.entity';
import { SosAlert } from './entities/sos-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MedicalFacility, EmergencyContact, SosAlert]),
    UsersModule,
  ],
  controllers: [EmergencyController, EmergencyContactsController],
  providers: [EmergencyService, EmergencyRepository],
})
export class EmergencyModule {}
