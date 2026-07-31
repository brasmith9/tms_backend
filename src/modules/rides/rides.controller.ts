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
import { ApiEnvelopeResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { QuoteRideDto } from './dto/quote-ride.dto';
import {
  NearbyDriverDto,
  QuoteResponseDto,
  RideResponseDto,
} from './dto/ride-response.dto';
import { NearbyDriversQueryDto, RequestRideDto } from './dto/request-ride.dto';
import { RideStatus } from './ride.types';
import { RidesService } from './rides.service';

@ApiTags('Rides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rides')
export class RidesController {
  constructor(private readonly rides: RidesService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Estimate a fare (creates a short-lived quote)' })
  @ApiEnvelopeResponse(QuoteResponseDto)
  async quote(@Body() dto: QuoteRideDto): Promise<QuoteResponseDto> {
    return QuoteResponseDto.from(await this.rides.quote(dto));
  }

  @Get('drivers/nearby')
  @ApiOperation({ summary: 'List nearby available drivers' })
  async nearby(@Query() q: NearbyDriversQueryDto): Promise<NearbyDriverDto[]> {
    const rows = await this.rides.nearbyDrivers(
      { lat: q.lat, lng: q.lng },
      q.vehicleType,
    );
    return rows.map((r) => NearbyDriverDto.from(r.driver, r.etaMinutes));
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.TOURIST)
  @ResponseMessage('Ride requested — a driver is on the way')
  @ApiOperation({ summary: 'Request a ride from a quote (assigns a driver)' })
  async request(
    @CurrentUser() user: AuthUser,
    @Body() dto: RequestRideDto,
  ): Promise<RideResponseDto> {
    const { ride, driver } = await this.rides.request(user.id, dto.quoteId);
    return RideResponseDto.from(ride, driver);
  }

  @Get('me')
  @ApiOperation({ summary: 'List my rides' })
  async mine(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: RideStatus,
  ): Promise<RideResponseDto[]> {
    const rides = await this.rides.findMine(user.id, status);
    return Promise.all(
      rides.map(async (ride) =>
        RideResponseDto.from(ride, await this.rides.driverFor(ride.driverId)),
      ),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my rides (poll or use the socket)' })
  @ApiEnvelopeResponse(RideResponseDto)
  async byId(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RideResponseDto> {
    const { ride, driver } = await this.rides.getRide(user.id, id);
    return RideResponseDto.from(ride, driver);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a ride' })
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RideResponseDto> {
    const ride = await this.rides.cancel(user.id, id);
    return RideResponseDto.from(
      ride,
      await this.rides.driverFor(ride.driverId),
    );
  }
}
