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
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
} from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { ReservationResponseDto } from '../reservations/dto/reservation-response.dto';
import {
  MenuResponseDto,
  RestaurantResponseDto,
} from './dto/restaurant-response.dto';
import { RestaurantQueryDto } from './dto/restaurant-query.dto';
import { AvailabilityQueryDto, ReserveTableDto } from './dto/reserve-table.dto';
import { FoodService } from './food.service';

@ApiTags('Food')
@Controller('restaurants')
export class FoodController {
  constructor(private readonly food: FoodService) {}

  @Get()
  @ApiOperation({ summary: 'Search restaurants (public)' })
  @ApiPaginatedResponse(RestaurantResponseDto)
  search(@Query() q: RestaurantQueryDto) {
    return this.food.search(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a restaurant by slug (public)' })
  @ApiEnvelopeResponse(RestaurantResponseDto)
  findBySlug(@Param('slug') slug: string): Promise<RestaurantResponseDto> {
    return this.food.findBySlug(slug);
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get a restaurant menu (public)' })
  async menu(@Param('id', ParseUUIDPipe) id: string): Promise<MenuResponseDto> {
    return MenuResponseDto.from(await this.food.menu(id));
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Bookable table slots for a date (public)' })
  availability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: AvailabilityQueryDto,
  ) {
    return this.food.availability(id, q.date, q.partySize);
  }

  @Post(':id/reserve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TOURIST)
  @ResponseMessage('Table reserved')
  @ApiOperation({ summary: 'Reserve a table (tourist)' })
  async reserve(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveTableDto,
  ): Promise<ReservationResponseDto> {
    return ReservationResponseDto.from(
      await this.food.reserve(user.id, id, dto),
    );
  }
}
