import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum Cabin {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

/** Fare multipliers applied to a flight's base (economy) price per cabin. */
export const CABIN_MULTIPLIER: Record<Cabin, number> = {
  [Cabin.ECONOMY]: 1,
  [Cabin.PREMIUM_ECONOMY]: 1.5,
  [Cabin.BUSINESS]: 2.5,
  [Cabin.FIRST]: 4,
};

@Entity('flights')
@Index(['origin', 'destination'])
export class Flight {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'airline_code' }) airlineCode!: string;
  @Column({ name: 'airline_name' }) airlineName!: string;
  @Column({ name: 'airline_logo_url', nullable: true }) airlineLogoUrl?: string;
  @Column({ length: 3 }) origin!: string; // IATA
  @Column({ length: 3 }) destination!: string;
  @Column({ name: 'departs_at', type: 'timestamptz' }) departsAt!: Date;
  @Column({ name: 'arrives_at', type: 'timestamptz' }) arrivesAt!: Date;
  @Column({ name: 'flight_number' }) flightNumber!: string;
  @Column({ name: 'duration_minutes', type: 'int' }) durationMinutes!: number;
  @Column({ type: 'int', default: 0 }) stops!: number;
  @Column({ name: 'baggage_kg', type: 'int', nullable: true })
  baggageKg?: number;
  @Column({ default: true }) refundable!: boolean;
  @Column({ type: 'jsonb', default: () => "'[]'" }) amenities!: string[];
  @Column({ name: 'price_minor', type: 'int' }) priceMinor!: number; // economy base
  @Column({ default: 'GHS' }) currency!: string;
  @Column({ name: 'seats_available', type: 'int', default: 9 })
  seatsAvailable!: number;
}
