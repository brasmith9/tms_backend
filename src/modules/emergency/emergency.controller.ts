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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { FacilityQueryDto } from './dto/facility-query.dto';
import { FacilityResponseDto } from './dto/facility-response.dto';
import { SosResponseDto } from './dto/sos-response.dto';
import { TriggerSosDto } from './dto/trigger-sos.dto';
import { EmergencyNumber } from './emergency-numbers';
import { EmergencyService } from './emergency.service';

@ApiTags('Emergency')
@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergency: EmergencyService) {}

  @Get('facilities')
  @ApiOperation({
    summary: 'Nearest hospitals/clinics/etc. (public, no auth required)',
  })
  async facilities(
    @Query() q: FacilityQueryDto,
  ): Promise<FacilityResponseDto[]> {
    const rows = await this.emergency.findFacilities(q);
    return rows.map((r) => FacilityResponseDto.from(r.facility, r.distanceKm));
  }

  @Get('contacts')
  @ApiOperation({
    summary: 'National emergency numbers (public, no auth required)',
  })
  contacts(@Query('country') country = 'GH'): EmergencyNumber[] {
    return this.emergency.emergencyNumbers(country);
  }

  @Post('sos')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trigger an SOS (idempotent on alertId)' })
  async triggerSos(
    @CurrentUser() user: AuthUser,
    @Body() dto: TriggerSosDto,
  ): Promise<SosResponseDto> {
    const { alert, numbers } = await this.emergency.triggerSos(user.id, dto);
    return SosResponseDto.from(alert, numbers);
  }

  @Get('sos/:alertId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one of my SOS alerts' })
  async getSos(
    @CurrentUser() user: AuthUser,
    @Param('alertId') alertId: string,
  ): Promise<SosResponseDto> {
    const alert = await this.emergency.getSos(user.id, alertId);
    return SosResponseDto.from(alert, this.emergency.emergencyNumbers());
  }

  @Post('sos/:alertId/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel an active SOS alert' })
  async cancelSos(
    @CurrentUser() user: AuthUser,
    @Param('alertId') alertId: string,
  ): Promise<SosResponseDto> {
    const alert = await this.emergency.cancelSos(user.id, alertId);
    return SosResponseDto.from(alert, this.emergency.emergencyNumbers());
  }
}
