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
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
} from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { BookingQueryDto } from './dto/booking-query.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { TripResponseDto } from './dto/trip-response.dto';
import { TourBooking } from './entities/tour-booking.entity';
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
    return this.withItem(await this.bookings.create(user.id, dto));
  }

  @Get('me')
  @ApiOperation({
    summary: 'My unified trips (tours + reservations), filtered by tab/type',
  })
  @ApiPaginatedResponse(TripResponseDto)
  mine(@CurrentUser() user: AuthUser, @Query() q: BookingQueryDto) {
    return this.bookings.findMineTrips(user.id, q);
  }

  @Get(':reference')
  @ApiOperation({
    summary: 'Get a trip by reference (tour booking or reservation)',
  })
  @ApiEnvelopeResponse(TripResponseDto)
  byReference(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<TripResponseDto> {
    return this.bookings.findTripByReference(reference, user);
  }

  @Post(':reference/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TOURIST)
  @ApiOperation({ summary: 'Cancel a trip (refund if outside the window)' })
  @ApiEnvelopeResponse(TripResponseDto)
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<TripResponseDto> {
    return this.bookings.cancelTrip(reference, user.id);
  }

  /** Attaches the embedded tour summary to a single booking response. */
  private async withItem(booking: TourBooking): Promise<BookingResponseDto> {
    const items = await this.bookings.resolveItems([booking]);
    return BookingResponseDto.from(booking, items.get(booking.departureId));
  }
}
