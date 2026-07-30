import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('operator_profiles')
export class OperatorProfile {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @OneToOne(() => User, (u) => u.operatorProfile)
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Column({ name: 'company_name' }) companyName!: string;
  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;
}
