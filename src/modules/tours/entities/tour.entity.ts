import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TourStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
}

@Entity('tours')
export class Tour {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'operator_id' }) operatorId!: string;
  @Index() @Column({ name: 'destination_id' }) destinationId!: string;
  @Column() title!: string;
  @Column({ unique: true }) slug!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'price_minor', type: 'int' }) priceMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ name: 'duration_minutes', type: 'int' }) durationMinutes!: number;
  @Column({ type: 'enum', enum: TourStatus, default: TourStatus.DRAFT })
  status!: TourStatus;
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ name: 'rating_avg', type: 'double precision', default: 0 })
  ratingAvg!: number;
  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
