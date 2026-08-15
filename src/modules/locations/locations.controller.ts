import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
} from '../../common/dto/api-response.dto';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { LocationQueryDto } from './dto/location-query.dto';
import { LocationResponseDto } from './dto/location-response.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationsService } from './locations.service';

@ApiTags('Campus Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  @ApiOperation({ summary: 'Search campus locations (public)' })
  @ApiPaginatedResponse(LocationResponseDto)
  search(@Query() q: LocationQueryDto) {
    return this.locations.search(q);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a campus location by slug (public)' })
  @ApiEnvelopeResponse(LocationResponseDto)
  findBySlug(@Param('slug') slug: string): Promise<LocationResponseDto> {
    return this.locations.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a campus location (admin)' })
  @ApiEnvelopeResponse(LocationResponseDto)
  async create(@Body() dto: CreateLocationDto): Promise<LocationResponseDto> {
    return LocationResponseDto.from(await this.locations.create(dto));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a campus location (admin)' })
  @ApiEnvelopeResponse(LocationResponseDto)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationResponseDto> {
    return LocationResponseDto.from(await this.locations.update(id, dto));
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Location deleted')
  @ApiOperation({ summary: 'Delete a campus location (admin)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<null> {
    await this.locations.remove(id);
    return null;
  }
}
