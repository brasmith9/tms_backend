import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { RestaurantReview } from '../entities/restaurant-review.entity';

/**
 * Reviewer identity. Carried by name, not just id — a reviews list that shows
 * only an `authorId` cannot render who wrote anything, which is the gap
 * `api-requirements.md` §B.3 asks not to repeat from the tour review payload.
 */
export class ReviewAuthorDto {
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional() avatarUrl?: string;
}

export class RestaurantReviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() restaurantId!: string;
  @ApiProperty() rating!: number;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty({ type: ReviewAuthorDto }) author!: ReviewAuthorDto;

  static from(
    r: RestaurantReview,
    author?: Pick<User, 'fullName' | 'avatarUrl'> | null,
  ): RestaurantReviewResponseDto {
    const dto = new RestaurantReviewResponseDto();
    dto.id = r.id;
    dto.restaurantId = r.restaurantId;
    dto.rating = r.rating;
    dto.body = r.body;
    dto.createdAt = r.createdAt;
    // A deleted account cascades its reviews away, so a missing author is only
    // reachable mid-delete; name it rather than emitting a hole in the payload.
    dto.author = {
      fullName: author?.fullName ?? 'Former user',
      avatarUrl: author?.avatarUrl,
    };
    return dto;
  }
}
