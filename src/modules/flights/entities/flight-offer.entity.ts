import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cabin } from './flight.entity';

/**
 * A priced, time-limited quote for a flight. Created on search so the client
 * books a locked fare that cannot go stale.
 */
@Entity('flight_offers')
export class FlightOffer {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'flight_id' }) flightId!: string;
  @Column({ type: 'enum', enum: Cabin }) cabin!: Cabin;
  @Column({ type: 'int', default: 1 }) adults!: number;
  @Column({ type: 'int', default: 0 }) children!: number;
  @Column({ type: 'int', default: 0 }) infants!: number;
  @Column({ name: 'total_minor', type: 'int' }) totalMinor!: number;
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
