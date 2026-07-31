import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum FacilityType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  PHARMACY = 'PHARMACY',
  POLICE = 'POLICE',
  FIRE = 'FIRE',
  EMBASSY = 'EMBASSY',
}

@Entity('medical_facilities')
export class MedicalFacility {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Index() @Column({ type: 'enum', enum: FacilityType }) type!: FacilityType;
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Column() phone!: string;
  @Column({ name: 'open_24h', default: false }) open24h!: boolean;
  @Index() @Column({ default: 'GH' }) country!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
