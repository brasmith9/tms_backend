import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('tours/:id/reviews')
  @ApiOperation({ summary: 'List reviews for a tour (public)' })
  @ApiPaginatedResponse(ReviewResponseDto)
  async forTour(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PaginationQueryDto,
  ) {
    const page = await this.reviews.listForTour(id, q);
    return {
      ...page,
      results: page.results.map((r) => ReviewResponseDto.from(r)),
    };
  }

  @Post('bookings/:reference/review')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Review a completed booking (tourist)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return ReviewResponseDto.from(
      await this.reviews.create(reference, user, dto),
    );
  }
}
