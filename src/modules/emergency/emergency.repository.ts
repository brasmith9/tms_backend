import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EmergencyContact } from './entities/emergency-contact.entity';
import {
  FacilityType,
  MedicalFacility,
} from './entities/medical-facility.entity';
import { SosAlert } from './entities/sos-alert.entity';

@Injectable()
export class EmergencyRepository {
  constructor(
    @InjectRepository(MedicalFacility)
    private readonly facilities: Repository<MedicalFacility>,
    @InjectRepository(EmergencyContact)
    private readonly contacts: Repository<EmergencyContact>,
    @InjectRepository(SosAlert)
    private readonly alerts: Repository<SosAlert>,
    private readonly dataSource: DataSource,
  ) {}

  findFacilities(
    country: string,
    type?: FacilityType,
  ): Promise<MedicalFacility[]> {
    return this.facilities.find({
      where: type ? { country, type } : { country },
    });
  }

  contactsFor(userId: string): Promise<EmergencyContact[]> {
    return this.contacts.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Replaces a user's whole contact set atomically. */
  async replaceContacts(
    userId: string,
    contacts: Partial<EmergencyContact>[],
  ): Promise<EmergencyContact[]> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(EmergencyContact);
      await repo.delete({ userId });
      const rows = contacts.map((c) => repo.create({ ...c, userId }));
      return repo.save(rows);
    });
  }

  findAlert(alertId: string): Promise<SosAlert | null> {
    return this.alerts.findOne({ where: { alertId } });
  }

  saveAlert(alert: SosAlert): Promise<SosAlert> {
    return this.alerts.save(alert);
  }

  createAlert(input: Partial<SosAlert>): SosAlert {
    return this.alerts.create(input);
  }
}
