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

/**
 * Two products share this enum. `TOURIST`/`OPERATOR` belong to the tourism side
 * (tours, bookings, reservations); `STUDENT`/`STAFF`/`VISITOR`/`VENDOR` are the
 * CampusPal user classes from SRS 2.3. `ADMIN` serves both. Nothing was renamed
 * — the tourism roles are load-bearing for existing bookings.
 */
export enum UserRole {
  TOURIST = 'TOURIST',
  OPERATOR = 'OPERATOR',
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
  VISITOR = 'VISITOR',
  /** Owns a restaurant / campus food joint and may manage its listing and menu. */
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
}

/**
 * What a person may pick for themselves at sign-up. VENDOR, OPERATOR and ADMIN
 * are deliberately absent — those are provisioned, never self-declared.
 */
export const SELF_SELECTABLE_ROLES = [
  UserRole.STUDENT,
  UserRole.STAFF,
  UserRole.VISITOR,
] as const;

/**
 * Everyone who may review a food joint or chat as a signed-in user: the campus
 * classes plus the tourism `TOURIST`, so existing accounts keep working.
 */
export const DINER_ROLES = [
  UserRole.TOURIST,
  UserRole.STUDENT,
  UserRole.STAFF,
  UserRole.VISITOR,
] as const;

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) email!: string;
  @Exclude() @Column({ name: 'password_hash' }) passwordHash!: string;
  @Column({ name: 'full_name' }) fullName!: string;
  @Column({ nullable: true }) phone?: string;
  @Column({ name: 'avatar_url', nullable: true }) avatarUrl?: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.TOURIST })
  role!: UserRole;
  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints!: number;
  @OneToOne(() => OperatorProfile, (p) => p.user)
  operatorProfile?: OperatorProfile;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
