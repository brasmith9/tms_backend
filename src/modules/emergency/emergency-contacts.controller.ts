import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import {
  EmergencyContactResponseDto,
  ReplaceEmergencyContactsDto,
} from './dto/emergency-contacts.dto';
import { EmergencyService } from './emergency.service';

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users/me/emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly emergency: EmergencyService) {}

  @Get()
  @ApiOperation({ summary: 'List my emergency contacts' })
  async list(
    @CurrentUser() user: AuthUser,
  ): Promise<EmergencyContactResponseDto[]> {
    const rows = await this.emergency.listContacts(user.id);
    return rows.map((c) => EmergencyContactResponseDto.from(c));
  }

  @Put()
  @ApiOperation({ summary: 'Replace my emergency contacts (max 10)' })
  @ResponseMessage('Emergency contacts updated')
  async replace(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReplaceEmergencyContactsDto,
  ): Promise<EmergencyContactResponseDto[]> {
    const rows = await this.emergency.replaceContacts(user.id, dto.contacts);
    return rows.map((c) => EmergencyContactResponseDto.from(c));
  }
}
