import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum SosKind {
  MEDICAL = 'MEDICAL',
  SECURITY = 'SECURITY',
  FIRE = 'FIRE',
  OTHER = 'OTHER',
}

export enum SosStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  RESOLVED = 'RESOLVED',
}

@Entity('sos_alerts')
export class SosAlert {
  @PrimaryGeneratedColumn('uuid') id!: string;
  /** Client-generated id used to dedupe repeated taps. */
  @Column({ name: 'alert_id', unique: true }) alertId!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Column({ type: 'enum', enum: SosKind }) kind!: SosKind;
  @Column({ type: 'text', nullable: true }) note?: string;
  @Column({ type: 'enum', enum: SosStatus, default: SosStatus.ACTIVE })
  status!: SosStatus;
  @Column({ name: 'notified_contacts', type: 'int', default: 0 })
  notifiedContacts!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;
}
