import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('destinations')
export class Destination {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() name!: string;
  @Column() region!: string;
  @Column({ default: 'Ghana' }) country!: string;
  @Column({ type: 'text' }) description!: string;
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ type: 'double precision', nullable: true }) lat?: number;
  @Column({ type: 'double precision', nullable: true }) lng?: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
