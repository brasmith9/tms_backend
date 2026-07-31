import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { ReservationResponseDto } from '../reservations/dto/reservation-response.dto';
import { OfferResponseDto } from './dto/offer-response.dto';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { FlightsService } from './flights.service';

@ApiTags('Flights')
@Controller('flights')
export class FlightsController {
  constructor(private readonly flights: FlightsService) {}

  @Get('airports')
  @ApiOperation({ summary: 'Search airports (public)' })
  airports(@Query('q') q?: string) {
    return this.flights.airports(q);
  }

  @Post('search')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Search flights → time-limited priced offers (public)',
  })
  search(@Body() dto: SearchFlightsDto) {
    return this.flights.search(dto);
  }

  @Get('offers/:offerId')
  @ApiOperation({ summary: 'Get a single offer (400 if expired)' })
  @ApiEnvelopeResponse(OfferResponseDto)
  getOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ): Promise<OfferResponseDto> {
    return this.flights.getOffer(offerId);
  }

  @Post('offers/:offerId/book')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TOURIST)
  @ResponseMessage('Flight reserved — complete payment to confirm')
  @ApiOperation({
    summary: 'Book an offer (tourist) — creates a PENDING reservation',
  })
  async book(
    @CurrentUser() user: AuthUser,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ): Promise<ReservationResponseDto> {
    return ReservationResponseDto.from(
      await this.flights.book(user.id, offerId),
    );
  }
}
