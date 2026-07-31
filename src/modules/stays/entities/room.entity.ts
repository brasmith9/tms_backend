import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'stay_id' }) stayId!: string;
  @Column() name!: string;
  @Column({ name: 'max_guests', type: 'int' }) maxGuests!: number;
  @Column() bed!: string;
  @Column({ name: 'price_per_night_minor', type: 'int' })
  pricePerNightMinor!: number;
  @Column({ default: true }) available!: boolean;
}
