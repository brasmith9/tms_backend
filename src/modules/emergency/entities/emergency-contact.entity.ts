import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('emergency_contacts')
export class EmergencyContact {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column() name!: string;
  @Column() phone!: string;
  @Column({ nullable: true }) email?: string;
  @Column({ nullable: true }) relationship?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
