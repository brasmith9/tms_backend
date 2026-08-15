import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  ApiEnvelopeResponse,
  ApiPaginatedResponse,
} from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { AuthUser } from '../auth/auth-user.type';
import { AssistantService } from './assistant.service';
import { ChatReplyDto } from './dto/chat-reply.dto';
import { ChatRequestDto } from './dto/chat.dto';
import { ChatSessionResponseDto } from './dto/chat-session-response.dto';

@ApiTags('Campus Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  @Post('chat')
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Ask the campus assistant. Works without a token — a guest gets an ' +
      'unowned session id back instead of a 401.',
  })
  @ApiEnvelopeResponse(ChatReplyDto)
  chat(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: ChatRequestDto,
  ): Promise<ChatReplyDto> {
    return this.assistant.chat(user?.id ?? null, dto);
  }

  @Post('chat/stream')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Same turn as POST /assistant/chat, streamed as SSE. Emits `delta` ' +
      'events with prose, then one `done` event carrying the grounded ' +
      'sessionId, actions and results. Errors arrive as an `error` event.',
  })
  async chatStream(
    @CurrentUser() user: AuthUser | undefined,
    @Body() dto: ChatRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx buffers text/event-stream by default, which would defeat the point.
      'X-Accel-Buffering': 'no',
    });

    const send = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const reply = await this.assistant.chatStream(
        user?.id ?? null,
        dto,
        (text) => send('delta', { reply: text }),
      );
      // The authoritative payload: actions and results here are grounded, the
      // deltas above are only the prose as it was produced.
      send('done', reply);
    } catch (err) {
      send('error', { message: messageOf(err) });
    } finally {
      res.end();
    }
  }

  @Get('sessions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List my chat sessions' })
  @ApiPaginatedResponse(ChatSessionResponseDto)
  listSessions(@CurrentUser() user: AuthUser, @Query() q: PaginationQueryDto) {
    return this.assistant.listSessions(user.id, q);
  }

  @Get('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get one of my chat sessions with its messages' })
  @ApiEnvelopeResponse(ChatSessionResponseDto)
  getSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatSessionResponseDto> {
    return this.assistant.getSession(id, user.id);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Chat history cleared')
  @ApiOperation({ summary: 'Delete one of my chat sessions and its messages' })
  async removeSession(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<null> {
    await this.assistant.removeSession(id, user.id);
    return null;
  }
}

const messageOf = (err: unknown): string =>
  err instanceof Error ? err.message : 'The campus assistant is unavailable';
