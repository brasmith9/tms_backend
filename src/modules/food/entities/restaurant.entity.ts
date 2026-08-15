import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface OpeningHour {
  day: number; // 0 = Sunday .. 6 = Saturday
  opens: string; // "09:00"
  closes: string; // "22:00"
}

export interface MenuItem {
  name: string;
  description?: string;
  priceMinor: number;
  photoUrl?: string;
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true }) slug!: string;
  @Column() name!: string;
  @Index() @Column() cuisine!: string;
  @Column({ name: 'price_tier', type: 'int' }) priceTier!: number; // 1..4
  @Column({ type: 'text' }) description!: string;
  @Column({ type: 'double precision' }) lat!: number;
  @Column({ type: 'double precision' }) lng!: number;
  @Column({ name: 'hero_image_url', nullable: true }) heroImageUrl?: string;
  @Column({ type: 'jsonb', default: () => "'[]'" }) images!: string[];
  @Column({ type: 'jsonb', default: () => "'[]'" }) dietary!: string[];
  @Column({ name: 'opening_hours', type: 'jsonb', default: () => "'[]'" })
  openingHours!: OpeningHour[];
  @Column({ type: 'jsonb', default: () => "'[]'" }) menu!: MenuSection[];
  /**
   * Contact details are published only when `contactConsent` is true — see the
   * gate in RestaurantResponseDto.from(). Storage is unconditional; disclosure
   * is not.
   */
  @Column({ nullable: true }) phone?: string;
  @Column({ nullable: true }) whatsapp?: string;
  @Column({ nullable: true }) email?: string;
  @Column({ name: 'contact_consent', type: 'boolean', default: false })
  contactConsent!: boolean;
  /** The VENDOR who may manage this listing; null for editorially-seeded rows. */
  @Index() @Column({ name: 'owner_id', nullable: true }) ownerId?: string;
  /** Campus landmark this joint sits by — "near Commonwealth Hall". */
  @Index()
  @Column({ name: 'nearest_location_id', type: 'uuid', nullable: true })
  nearestLocationId?: string | null;
  @Column({ name: 'rating_avg', type: 'double precision', default: 0 })
  ratingAvg!: number;
  @Column({ name: 'rating_count', type: 'int', default: 0 })
  ratingCount!: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
