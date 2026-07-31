import { ApiProperty } from '@nestjs/swagger';
import type { EmergencyNumber } from '../emergency-numbers';
import { SosAlert, SosKind, SosStatus } from '../entities/sos-alert.entity';

export class SosResponseDto {
  @ApiProperty() alertId!: string;
  @ApiProperty({ enum: SosStatus }) status!: SosStatus;
  @ApiProperty({ enum: SosKind }) kind!: SosKind;
  @ApiProperty() lat!: number;
  @ApiProperty() lng!: number;
  @ApiProperty({ required: false }) note?: string;
  @ApiProperty({ description: 'How many emergency contacts were notified' })
  notifiedContacts!: number;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({
    description:
      'Numbers to call — always returned, even if notifications fail',
    example: [{ label: 'Ambulance', number: '193' }],
  })
  emergencyNumbers!: EmergencyNumber[];

  static from(a: SosAlert, numbers: EmergencyNumber[]): SosResponseDto {
    const dto = new SosResponseDto();
    dto.alertId = a.alertId;
    dto.status = a.status;
    dto.kind = a.kind;
    dto.lat = a.lat;
    dto.lng = a.lng;
    dto.note = a.note;
    dto.notifiedContacts = a.notifiedContacts;
    dto.createdAt = a.createdAt;
    dto.emergencyNumbers = numbers;
    return dto;
  }
}
