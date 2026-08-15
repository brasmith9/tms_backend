import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LocationCategory {
  LECTURE_HALL = 'LECTURE_HALL',
  DEPARTMENT = 'DEPARTMENT',
  PARK_FIELD = 'PARK_FIELD',
  HOSTEL_HALL = 'HOSTEL_HALL',
  ADMINISTRATION = 'ADMINISTRATION',
  OTHER = 'OTHER',
}

/** A navigable point on the University of Ghana, Legon campus. */
@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) slug!: string;
  @Column() name!: string;
  @Index()
  @Column({ type: 'enum', enum: LocationCategory })
  category!: LocationCategory;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) photos!: string[];
  /** Associated building or landmark notes — "ground floor, behind the Great Hall". */
  @Column({ name: 'building_notes', type: 'text', nullable: true })
  buildingNotes?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
