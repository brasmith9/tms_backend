import {
  Body,
  Controller,
  Delete,
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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UserRole } from '../users/entities/user.entity';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { ItineraryResponseDto } from './dto/itinerary-response.dto';
import { ItinerariesService } from './itineraries.service';

@ApiTags('Itineraries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itineraries: ItinerariesService) {}

  @Post('generate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TOURIST)
  @ResponseMessage('Itinerary generated')
  @ApiOperation({ summary: 'Generate an AI itinerary grounded in real tours' })
  @ApiEnvelopeResponse(ItineraryResponseDto)
  async generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateItineraryDto,
  ): Promise<ItineraryResponseDto> {
    return ItineraryResponseDto.from(
      await this.itineraries.generate(user.id, dto),
    );
  }

  @Get()
  @ApiOperation({ summary: 'List my itineraries' })
  @ApiPaginatedResponse(ItineraryResponseDto)
  async mine(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    const page = await this.itineraries.findMine(user.id, q);
    return {
      ...page,
      results: page.results.map((i) => ItineraryResponseDto.from(i)),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my itineraries' })
  @ApiEnvelopeResponse(ItineraryResponseDto)
  async byId(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<ItineraryResponseDto> {
    return ItineraryResponseDto.from(
      await this.itineraries.findOneForUser(id, user.id),
    );
  }

  @Delete(':id')
  @ResponseMessage('Itinerary deleted')
  @ApiOperation({ summary: 'Delete one of my itineraries' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.itineraries.removeForUser(id, user.id);
  }
}
