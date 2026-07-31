import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { VehicleType } from '../ride.types';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column() phone!: string;
  @Column({ type: 'double precision', default: 4.8 }) rating!: number;
  @Index()
  @Column({ name: 'vehicle_type', type: 'enum', enum: VehicleType })
  vehicleType!: VehicleType;
  @Column({ name: 'vehicle_make' }) vehicleMake!: string;
  @Column({ name: 'vehicle_model' }) vehicleModel!: string;
  @Column({ name: 'vehicle_plate' }) vehiclePlate!: string;
  @Column({ name: 'vehicle_color' }) vehicleColor!: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Index() @Column({ default: true }) available!: boolean;
}
