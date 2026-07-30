import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ItineraryPlan } from '../itinerary-planner.port';

@Entity('itineraries')
export class Itinerary {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column() title!: string;
  @Column({ name: 'destination_name' }) destinationName!: string;
  @Column({ type: 'int' }) days!: number;
  @Column({ name: 'budget_minor', type: 'int', nullable: true })
  budgetMinor?: number | null;
  @Column({ name: 'party_size', type: 'int', default: 1 }) partySize!: number;
  @Column({ type: 'jsonb', default: () => "'[]'" }) interests!: string[];
  @Column({ type: 'jsonb' }) plan!: ItineraryPlan;
  @Column() model!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
