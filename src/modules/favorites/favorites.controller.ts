import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import {
  CreateFavoriteDto,
  FavoriteQueryDto,
  FavoriteResponseDto,
} from './dto/favorite.dto';
import { FavoritesService } from './favorites.service';

@ApiTags('Favourites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List my favourites (optionally by type)' })
  @ApiPaginatedResponse(FavoriteResponseDto)
  async list(@CurrentUser() user: AuthUser, @Query() q: FavoriteQueryDto) {
    const page = await this.favorites.list(user.id, q);
    return {
      ...page,
      results: page.results.map((f) => FavoriteResponseDto.from(f)),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Add a favourite (snapshots the item)' })
  async add(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFavoriteDto,
  ): Promise<FavoriteResponseDto> {
    return FavoriteResponseDto.from(await this.favorites.add(user.id, dto));
  }

  @Delete(':id')
  @ResponseMessage('Removed from favourites')
  @ApiOperation({ summary: 'Remove a favourite' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.favorites.remove(user.id, id);
  }
}
