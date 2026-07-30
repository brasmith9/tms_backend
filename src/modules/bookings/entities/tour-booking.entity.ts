import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('tour_bookings')
export class TourBooking {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) reference!: string;
  @Index() @Column({ name: 'tourist_id' }) touristId!: string;
  @Index() @Column({ name: 'departure_id' }) departureId!: string;
  @Column({ type: 'int' }) seats!: number;
  @Column({ name: 'unit_price_minor', type: 'int' }) unitPriceMinor!: number;
  @Column({ name: 'total_minor', type: 'int' }) totalMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
