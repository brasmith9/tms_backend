import {
  Body,
  Controller,
  Get,
  Param,
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
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { BookingQueryDto } from './dto/booking-query.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Create a booking (holds seats, status PENDING)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return BookingResponseDto.from(await this.bookings.create(user.id, dto));
  }

  @Get('me')
  @ApiOperation({ summary: 'List my bookings, filtered by tab' })
  @ApiPaginatedResponse(BookingResponseDto)
  async mine(@CurrentUser() user: AuthUser, @Query() q: BookingQueryDto) {
    const page = await this.bookings.findMine(user.id, q);
    return {
      ...page,
      results: page.results.map((b) => BookingResponseDto.from(b)),
    };
  }

  @Get(':reference')
  @ApiOperation({ summary: 'Get a booking by reference' })
  async byReference(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<BookingResponseDto> {
    return BookingResponseDto.from(
      await this.bookings.findByReference(reference, user),
    );
  }

  @Post(':reference/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Cancel a booking (refund if outside the window)' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<BookingResponseDto> {
    return BookingResponseDto.from(
      await this.bookings.cancel(reference, user.id),
    );
  }
}
