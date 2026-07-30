import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'tour_id' }) tourId!: string;
  @Column({ name: 'booking_id', unique: true }) bookingId!: string;
  @Column({ name: 'author_id' }) authorId!: string;
  @Column({ type: 'int' }) rating!: number;
  @Column({ type: 'text' }) body!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
