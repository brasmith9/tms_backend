import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum DepartureStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
}

@Entity('tour_departures')
export class TourDeparture {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'tour_id' }) tourId!: string;
  @Column({ name: 'departs_at', type: 'timestamptz' }) departsAt!: Date;
  @Column({ type: 'int' }) capacity!: number;
  @Column({
    type: 'enum',
    enum: DepartureStatus,
    default: DepartureStatus.SCHEDULED,
  })
  status!: DepartureStatus;
}
