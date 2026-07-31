import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { distanceKm } from '../../common/geo/haversine';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { FacilityQueryDto } from './dto/facility-query.dto';
import { TriggerSosDto } from './dto/trigger-sos.dto';
import { EmergencyContact } from './entities/emergency-contact.entity';
import { MedicalFacility } from './entities/medical-facility.entity';
import { SosAlert, SosStatus } from './entities/sos-alert.entity';
import { EmergencyRepository } from './emergency.repository';
import { EmergencyNumber, emergencyNumbersFor } from './emergency-numbers';

export interface FacilityWithDistance {
  facility: MedicalFacility;
  distanceKm?: number;
}

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private readonly repo: EmergencyRepository,
    private readonly users: UsersService,
    private readonly mail: MailService,
  ) {}

  /** Nearest facilities first when the caller shares a location; public. */
  async findFacilities(q: FacilityQueryDto): Promise<FacilityWithDistance[]> {
    const country = (q.country ?? 'GH').toUpperCase();
    const facilities = await this.repo.findFacilities(country, q.type);

    const hasLocation = q.lat !== undefined && q.lng !== undefined;
    if (!hasLocation) {
      return facilities.map((facility) => ({ facility }));
    }

    return facilities
      .map((facility) => ({
        facility,
        distanceKm: distanceKm(q.lat!, q.lng!, facility.lat, facility.lng),
      }))
      .filter((f) => q.radiusKm === undefined || f.distanceKm <= q.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  emergencyNumbers(country = 'GH'): EmergencyNumber[] {
    return emergencyNumbersFor(country);
  }

  /**
   * Records an SOS and notifies the user's emergency contacts. Idempotent on
   * alertId (repeated taps return the same alert), and it never fails closed —
   * the emergency numbers are always returned even if notification breaks.
   */
  async triggerSos(
    userId: string,
    dto: TriggerSosDto,
  ): Promise<{ alert: SosAlert; numbers: EmergencyNumber[] }> {
    const numbers = this.emergencyNumbers();

    const existing = await this.repo.findAlert(dto.alertId);
    if (existing) {
      return { alert: existing, numbers };
    }

    const alert = this.repo.createAlert({
      alertId: dto.alertId,
      userId,
      lat: dto.lat,
      lng: dto.lng,
      kind: dto.kind,
      note: dto.note,
      status: SosStatus.ACTIVE,
    });
    alert.notifiedContacts = await this.notifyContacts(userId, dto);
    return { alert: await this.repo.saveAlert(alert), numbers };
  }

  async getSos(userId: string, alertId: string): Promise<SosAlert> {
    const alert = await this.repo.findAlert(alertId);
    if (!alert || alert.userId !== userId) {
      throw new NotFoundException(`SOS ${alertId} not found`);
    }
    return alert;
  }

  async cancelSos(userId: string, alertId: string): Promise<SosAlert> {
    const alert = await this.getSos(userId, alertId);
    if (alert.status === SosStatus.ACTIVE) {
      alert.status = SosStatus.CANCELLED;
      alert.cancelledAt = new Date();
      await this.repo.saveAlert(alert);
    }
    return alert;
  }

  listContacts(userId: string): Promise<EmergencyContact[]> {
    return this.repo.contactsFor(userId);
  }

  replaceContacts(
    userId: string,
    contacts: Partial<EmergencyContact>[],
  ): Promise<EmergencyContact[]> {
    return this.repo.replaceContacts(userId, contacts);
  }

  /** Emails each contact; degrades to 0 on any failure rather than failing the SOS. */
  private async notifyContacts(
    userId: string,
    dto: TriggerSosDto,
  ): Promise<number> {
    try {
      const [user, contacts] = await Promise.all([
        this.users.findById(userId),
        this.repo.contactsFor(userId),
      ]);
      // SMS is not wired yet, so only contacts with an email can be reached.
      const reachable = contacts.filter((c) => c.email);
      const mapsLink = `https://maps.google.com/?q=${dto.lat},${dto.lng}`;
      const results = await Promise.allSettled(
        reachable.map((c) =>
          this.mail.sendSosAlert(c.email!, {
            travellerName: user.fullName,
            contactName: c.name,
            kind: dto.kind,
            note: dto.note,
            mapsLink,
          }),
        ),
      );
      return results.filter((r) => r.status === 'fulfilled').length;
    } catch (err) {
      this.logger.error(
        `SOS notification failed for user ${userId}: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
      return 0;
    }
  }
}
