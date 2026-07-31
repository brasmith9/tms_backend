import { Test } from '@nestjs/testing';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { FacilityType } from './entities/medical-facility.entity';
import { SosKind, SosStatus } from './entities/sos-alert.entity';
import { EmergencyRepository } from './emergency.repository';
import { EmergencyService } from './emergency.service';

const facility = (name: string, lat: number, lng: number) => ({
  id: name,
  name,
  type: FacilityType.HOSPITAL,
  description: 'x',
  lat,
  lng,
  phone: '000',
  open24h: true,
  country: 'GH',
});

describe('EmergencyService', () => {
  let service: EmergencyService;
  let repo: Record<string, jest.Mock>;
  let mail: { sendSosAlert: jest.Mock };
  let users: { findById: jest.Mock };

  beforeEach(async () => {
    repo = {
      findFacilities: jest.fn(),
      contactsFor: jest.fn().mockResolvedValue([]),
      replaceContacts: jest.fn(),
      findAlert: jest.fn(),
      saveAlert: jest.fn((a) => Promise.resolve({ id: 'a1', ...a })),
      createAlert: jest.fn((a) => a),
    };
    mail = { sendSosAlert: jest.fn().mockResolvedValue(undefined) };
    users = {
      findById: jest
        .fn()
        .mockResolvedValue({ id: 'u1', email: 'u@t.com', fullName: 'Kofi' }),
    };

    const module = await Test.createTestingModule({
      providers: [
        EmergencyService,
        { provide: EmergencyRepository, useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = module.get(EmergencyService);
  });

  it('sorts facilities by distance and filters by radius when a location is given', async () => {
    repo.findFacilities.mockResolvedValue([
      facility('far', 6.7, -1.6), // Kumasi-ish, ~200km from Accra
      facility('near', 5.56, -0.2), // ~2km from the query point
    ]);
    const rows = await service.findFacilities({
      lat: 5.55,
      lng: -0.196,
      radiusKm: 50,
    });
    expect(rows.map((r) => r.facility.name)).toEqual(['near']);
    expect(rows[0].distanceKm).toBeGreaterThan(0);
  });

  it('returns facilities without distance when no location is given', async () => {
    repo.findFacilities.mockResolvedValue([facility('a', 5, -0.2)]);
    const rows = await service.findFacilities({});
    expect(rows[0].distanceKm).toBeUndefined();
  });

  it('is idempotent: a repeated alertId returns the existing alert without re-notifying', async () => {
    repo.findAlert.mockResolvedValue({
      id: 'a1',
      alertId: 'dup',
      userId: 'u1',
      status: SosStatus.ACTIVE,
    });
    const { alert } = await service.triggerSos('u1', {
      alertId: 'dup',
      lat: 5.5,
      lng: -0.2,
      kind: SosKind.MEDICAL,
    });
    expect(alert.id).toBe('a1');
    expect(repo.createAlert).not.toHaveBeenCalled();
    expect(mail.sendSosAlert).not.toHaveBeenCalled();
  });

  it('records the alert and returns numbers even when notification fails', async () => {
    repo.findAlert.mockResolvedValue(null);
    users.findById.mockRejectedValue(new Error('mail backend down'));
    const { alert, numbers } = await service.triggerSos('u1', {
      alertId: 'new',
      lat: 5.5,
      lng: -0.2,
      kind: SosKind.SECURITY,
    });
    expect(repo.saveAlert).toHaveBeenCalled();
    expect(alert.notifiedContacts).toBe(0);
    expect(numbers.length).toBeGreaterThan(0);
  });

  it('emails only contacts that have an email address', async () => {
    repo.findAlert.mockResolvedValue(null);
    repo.contactsFor.mockResolvedValue([
      { name: 'A', phone: '1', email: 'a@t.com' },
      { name: 'B', phone: '2' }, // no email — unreachable
    ]);
    const { alert } = await service.triggerSos('u1', {
      alertId: 'new2',
      lat: 5.5,
      lng: -0.2,
      kind: SosKind.MEDICAL,
    });
    expect(mail.sendSosAlert).toHaveBeenCalledTimes(1);
    expect(mail.sendSosAlert).toHaveBeenCalledWith(
      'a@t.com',
      expect.any(Object),
    );
    expect(alert.notifiedContacts).toBe(1);
  });
});
