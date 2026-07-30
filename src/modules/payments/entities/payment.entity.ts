import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'booking_id' }) bookingId!: string;
  @Column({ name: 'provider_ref', unique: true }) providerRef!: string;
  @Column({ name: 'amount_minor', type: 'int' }) amountMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;
  @Column({ name: 'authorization_url', nullable: true })
  authorizationUrl?: string;
  @Column({ name: 'raw_event', type: 'jsonb', nullable: true })
  rawEvent?: unknown;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
