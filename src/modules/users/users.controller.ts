import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoyaltyResponseDto } from './dto/loyalty-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { deriveTier } from './loyalty';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user profile' })
  async me(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.findById(user.id));
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update your name or phone' })
  async update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.users.updateProfile(user.id, dto));
  }

  @Get('me/loyalty')
  @ApiOperation({ summary: 'Get loyalty points and derived tier' })
  async loyalty(@CurrentUser() user: AuthUser): Promise<LoyaltyResponseDto> {
    const u = await this.users.findById(user.id);
    return { points: u.loyaltyPoints, tier: deriveTier(u.loyaltyPoints) };
  }
}
