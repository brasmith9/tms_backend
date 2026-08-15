import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A conversation with the campus assistant. `userId` is nullable on purpose:
 * a guest may chat without an account, and their session simply has no owner.
 * Guest sessions are not listable — only the holder of the id can continue one.
 */
@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;
  /** First user message, trimmed — what the history list shows. */
  @Column({ nullable: true }) title?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
