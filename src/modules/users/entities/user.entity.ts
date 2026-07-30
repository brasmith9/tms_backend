import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OperatorProfile } from './operator-profile.entity';

export enum UserRole {
  TOURIST = 'TOURIST',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Exclude() @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ name: 'full_name' }) fullName!: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.TOURIST })
  role!: UserRole;
  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints!: number;
  @OneToOne(() => OperatorProfile, (p) => p.user)
  operatorProfile?: OperatorProfile;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
