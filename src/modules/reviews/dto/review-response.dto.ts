import { ApiProperty } from '@nestjs/swagger';
import { Review } from '../entities/review.entity';

export class ReviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tourId!: string;
  @ApiProperty() authorId!: string;
  @ApiProperty() rating!: number;
  @ApiProperty() body!: string;
  @ApiProperty() createdAt!: Date;

  static from(r: Review): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = r.id;
    dto.tourId = r.tourId;
    dto.authorId = r.authorId;
    dto.rating = r.rating;
    dto.body = r.body;
    dto.createdAt = r.createdAt;
    return dto;
  }
}
