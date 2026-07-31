import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum StayCategory {
  HOTEL = 'HOTEL',
  VILLA = 'VILLA',
  HOSTEL = 'HOSTEL',
  APARTMENT = 'APARTMENT',
}

@Entity('stays')
export class Stay {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) slug!: string;
  @Column() name!: string;
  @Index()
  @Column({ type: 'enum', enum: StayCategory })
  category!: StayCategory;
  @Column() location!: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Column({ type: 'int', default: 3 }) stars!: number;
  @Column({ name: 'rating_avg', type: 'double precision', default: 0 })
  ratingAvg!: number;
  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount!: number;
  @Column({ name: 'from_price_minor', type: 'int' }) fromPriceMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ type: 'jsonb', default: () => "'[]'" }) amenities!: string[];
  @Column({ type: 'jsonb', default: () => "'[]'" }) images!: string[];
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ type: 'text' }) description!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
