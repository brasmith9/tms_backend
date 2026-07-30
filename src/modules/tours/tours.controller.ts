import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
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
import { Owns, OwnershipGuard } from '../../common/guards/ownership.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { CreateDepartureDto } from './dto/create-departure.dto';
import { CreateTourDto } from './dto/create-tour.dto';
import { DepartureResponseDto } from './dto/departure-response.dto';
import { TourQueryDto } from './dto/tour-query.dto';
import { TourResponseDto } from './dto/tour-response.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { TourDeparturesService } from './tour-departures.service';
import { ToursService } from './tours.service';

@ApiTags('Tours')
@Controller('tours')
export class ToursController {
  constructor(
    private readonly tours: ToursService,
    private readonly departures: TourDeparturesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search approved tours (public)' })
  @ApiPaginatedResponse(TourResponseDto)
  async search(@Query() q: TourQueryDto) {
    const page = await this.tours.search(q);
    return {
      ...page,
      results: page.results.map((t) => TourResponseDto.from(t)),
    };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an approved tour by slug (public)' })
  @ApiEnvelopeResponse(TourResponseDto)
  async findBySlug(@Param('slug') slug: string): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.findBySlug(slug));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OPERATOR)
  @ApiOperation({ summary: 'Create a tour draft (operator)' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTourDto,
  ): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.create(user.id, dto));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(UserRole.OPERATOR)
  @Owns('id')
  @ApiOperation({ summary: 'Update your tour (operator, owner only)' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTourDto,
  ): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.update(id, user.id, dto));
  }

  @Post(':id/submit')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(UserRole.OPERATOR)
  @Owns('id')
  @ApiOperation({ summary: 'Submit a draft for review (operator)' })
  async submit(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.submit(id, user.id));
  }

  @Post(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a tour pending review (admin)' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.approve(id));
  }

  @Post(':id/suspend')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a tour (admin)' })
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TourResponseDto> {
    return TourResponseDto.from(await this.tours.suspend(id));
  }

  @Get(':id/departures')
  @ApiOperation({
    summary: 'List a tour’s departures with seats left (public)',
  })
  async departuresFor(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DepartureResponseDto[]> {
    const rows = await this.departures.listForTour(id);
    return rows.map((r) => DepartureResponseDto.from(r.departure, r.seatsLeft));
  }

  @Post(':id/departures')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, OwnershipGuard)
  @Roles(UserRole.OPERATOR)
  @Owns('id')
  @ApiOperation({ summary: 'Add a departure to your tour (operator)' })
  async addDeparture(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDepartureDto,
  ): Promise<DepartureResponseDto> {
    const departure = await this.departures.create(id, user.id, dto);
    return DepartureResponseDto.from(departure, departure.capacity);
  }
}
