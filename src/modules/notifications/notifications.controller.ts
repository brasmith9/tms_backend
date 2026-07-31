import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import {
  NotificationQueryDto,
  NotificationResponseDto,
} from './dto/notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (+ unread count)' })
  async list(@CurrentUser() user: AuthUser, @Query() q: NotificationQueryDto) {
    const page = await this.notifications.list(user.id, q);
    return {
      ...page,
      results: page.results.map((n) => NotificationResponseDto.from(n)),
    };
  }

  @Post(':id/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark one notification read' })
  async read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationResponseDto> {
    return NotificationResponseDto.from(
      await this.notifications.markRead(user.id, id),
    );
  }

  @Post('read-all')
  @HttpCode(200)
  @ResponseMessage('All notifications marked read')
  @ApiOperation({ summary: 'Mark all my notifications read' })
  async readAll(@CurrentUser() user: AuthUser): Promise<{ updated: number }> {
    return { updated: await this.notifications.markAllRead(user.id) };
  }
}
