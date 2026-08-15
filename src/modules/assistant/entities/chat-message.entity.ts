import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { AssistantAction } from '../assistant-action';

export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'session_id', type: 'uuid' }) sessionId!: string;
  @Column({ type: 'enum', enum: ChatRole }) role!: ChatRole;
  @Column({ type: 'text' }) content!: string;
  /** Actions this turn triggered — already grounded, never raw model output. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  actions!: AssistantAction[];
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
