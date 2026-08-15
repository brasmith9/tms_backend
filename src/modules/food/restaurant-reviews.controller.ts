import {
  Body,
  Controller,
  Delete,
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
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';
import { DINER_ROLES, UserRole } from '../users/entities/user.entity';
import { RestaurantReviewResponseDto } from './dto/restaurant-review-response.dto';
import { RestaurantReviewsService } from './restaurant-reviews.service';

@ApiTags('Food')
@Controller('restaurants/:id/reviews')
export class RestaurantReviewsController {
  constructor(private readonly reviews: RestaurantReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'List reviews for a restaurant (public)' })
  @ApiPaginatedResponse(RestaurantReviewResponseDto)
  async list(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: PaginationQueryDto,
  ) {
    const page = await this.reviews.listForRestaurant(id, q);
    return {
      ...page,
      results: page.results.map((r) =>
        RestaurantReviewResponseDto.from(r, r.author),
      ),
    };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...DINER_ROLES)
  @ApiOperation({ summary: 'Review a restaurant (one per diner)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<RestaurantReviewResponseDto> {
    const review = await this.reviews.create(id, user.id, dto);
    return RestaurantReviewResponseDto.from(review, review.author);
  }

  @Delete(':reviewId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Review removed')
  @ApiOperation({
    summary: 'Remove an inappropriate review (admin) — SRS §7 moderation',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
  ): Promise<null> {
    await this.reviews.remove(id, reviewId);
    return null;
  }
}
