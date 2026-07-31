import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RideStatus, VehicleType } from '../ride.types';
import type { GeoPoint } from '../ride.types';

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column({ type: 'enum', enum: RideStatus, default: RideStatus.REQUESTED })
  status!: RideStatus;
  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;
  @Column({ type: 'jsonb' }) pickup!: GeoPoint;
  @Column({ type: 'jsonb' }) dropoff!: GeoPoint;
  @Column({ name: 'fare_minor', type: 'int' }) fareMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Index() @Column({ name: 'driver_id', nullable: true }) driverId?: string;
  @Column({ name: 'driver_lat', type: 'double precision', nullable: true })
  driverLat?: number;
  @Column({ name: 'driver_lng', type: 'double precision', nullable: true })
  driverLng?: number;
  @Column({ name: 'eta_minutes', type: 'int', nullable: true })
  etaMinutes?: number;
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt?: Date;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
