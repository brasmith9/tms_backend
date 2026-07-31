import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Polymorphic booking for the non-tour verticals (stays, flights, tables). */
export enum ReservationType {
  STAY = 'STAY',
  FLIGHT = 'FLIGHT',
  TABLE = 'TABLE',
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

/** Display snapshot embedded on the reservation so trips lists render standalone. */
export interface ReservationItem {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  startsAt?: string;
  endsAt?: string;
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) reference!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column({ type: 'enum', enum: ReservationType }) type!: ReservationType;
  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status!: ReservationStatus;
  @Column({ name: 'total_minor', type: 'int' }) totalMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'jsonb' }) item!: ReservationItem;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;
}
