import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserRole } from '../users/entities/user.entity';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationResponseDto } from './dto/destination-response.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { DestinationsService } from './destinations.service';

@ApiTags('Destinations')
@Controller('destinations')
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @Get()
  @ApiOperation({ summary: 'List destinations (public)' })
  async findAll(@Query() q: PaginationQueryDto) {
    const { data, meta } = await this.service.findAll(q);
    return { data: data.map((d) => DestinationResponseDto.from(d)), meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one destination (public)' })
  async findOne(@Param('id') id: string): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.findOne(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a destination (admin)' })
  async create(
    @Body() dto: CreateDestinationDto,
  ): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.create(dto));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a destination (admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDestinationDto,
  ): Promise<DestinationResponseDto> {
    return DestinationResponseDto.from(await this.service.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a destination (admin)' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
