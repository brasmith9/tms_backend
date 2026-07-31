import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiEnvelopeResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { ReservationResponseDto } from './dto/reservation-response.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get(':reference')
  @ApiOperation({ summary: 'Get one of my reservations (stay/flight/table)' })
  @ApiEnvelopeResponse(ReservationResponseDto)
  async byReference(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<ReservationResponseDto> {
    return ReservationResponseDto.from(
      await this.reservations.findByReference(reference, user),
    );
  }

  @Post(':reference/cancel')
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('reference') reference: string,
  ): Promise<ReservationResponseDto> {
    return ReservationResponseDto.from(
      await this.reservations.cancel(reference, user.id),
    );
  }
}
