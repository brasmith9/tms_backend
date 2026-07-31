import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleType } from '../ride.types';
import type { GeoPoint } from '../ride.types';

/** A short-lived fare estimate the client turns into a ride request. */
@Entity('ride_quotes')
export class RideQuote {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;
  @Column({ type: 'jsonb' }) pickup!: GeoPoint;
  @Column({ type: 'jsonb' }) dropoff!: GeoPoint;
  @Column({ name: 'fare_minor', type: 'int' }) fareMinor!: number;
  @Column({ name: 'eta_minutes', type: 'int' }) etaMinutes!: number;
  @Column({ name: 'surge_multiplier', type: 'double precision', default: 1 })
  surgeMultiplier!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
