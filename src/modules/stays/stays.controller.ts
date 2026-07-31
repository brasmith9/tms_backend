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
import { BookStayDto, RoomsQueryDto } from './dto/book-stay.dto';
import { StayQueryDto } from './dto/stay-query.dto';
import { RoomResponseDto, StayResponseDto } from './dto/stay-response.dto';
import { StaysService } from './stays.service';

@ApiTags('Stays')
@Controller('stays')
export class StaysController {
  constructor(private readonly stays: StaysService) {}

  @Get()
  @ApiOperation({ summary: 'Search stays (public)' })
  @ApiPaginatedResponse(StayResponseDto)
  search(@Query() q: StayQueryDto) {
    return this.stays.search(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a stay by slug (public)' })
  @ApiEnvelopeResponse(StayResponseDto)
  async findBySlug(@Param('slug') slug: string): Promise<StayResponseDto> {
    return StayResponseDto.from(await this.stays.findBySlug(slug));
  }

  @Get(':id/rooms')
  @ApiOperation({ summary: 'List a stay’s rooms with rates (public)' })
  async rooms(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: RoomsQueryDto,
  ): Promise<RoomResponseDto[]> {
    const rooms = await this.stays.rooms(id, q.guests);
    return rooms.map((r) => RoomResponseDto.from(r));
  }

  @Post(':id/book')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TOURIST)
  @ResponseMessage('Stay reserved — complete payment to confirm')
  @ApiOperation({
    summary: 'Book a stay (tourist) — creates a PENDING reservation',
  })
  async book(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BookStayDto,
  ): Promise<ReservationResponseDto> {
    return ReservationResponseDto.from(await this.stays.book(user.id, id, dto));
  }
}
