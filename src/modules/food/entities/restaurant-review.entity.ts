import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Kept separate from `reviews`, which is bound to a completed tour booking.
 * A campus food joint has no equivalent completed purchase (table reservations
 * are free), so these are gated on authentication plus one review per diner.
 */
@Entity('restaurant_reviews')
@Unique('UQ_restaurant_reviews_restaurant_author', ['restaurantId', 'authorId'])
export class RestaurantReview {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Index() @Column({ name: 'restaurant_id' }) restaurantId!: string;
  @Column({ name: 'author_id' }) authorId!: string;
  /** Loaded so the reviews list can show who wrote each one — §B.3. */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: User;
  @Column({ type: 'int' }) rating!: number;
  @Column({ type: 'text' }) body!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}
