import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum FavoriteType {
  TOUR = 'TOUR',
  STAY = 'STAY',
  RESTAURANT = 'RESTAURANT',
  DESTINATION = 'DESTINATION',
  /** A campus location — CampusPal's /saved screen. */
  LOCATION = 'LOCATION',
}

export interface FavoriteSnapshot {
  title: string;
  imageUrl?: string;
  slug?: string;
}

@Entity('favorites')
@Unique(['userId', 'type', 'itemId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'user_id' }) userId!: string;
  @Column({ type: 'enum', enum: FavoriteType }) type!: FavoriteType;
  @Column({ name: 'item_id' }) itemId!: string;
  @Column({ type: 'jsonb' }) snapshot!: FavoriteSnapshot;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
