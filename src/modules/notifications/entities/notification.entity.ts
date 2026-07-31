import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column() type!: string;
  @Column() title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'jsonb', nullable: true }) data?: Record<string, unknown>;
  @Index() @Column({ default: false }) read!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
