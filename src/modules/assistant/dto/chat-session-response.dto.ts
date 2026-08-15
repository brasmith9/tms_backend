import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AssistantAction } from '../assistant-action';
import { ChatMessage, ChatRole } from '../entities/chat-message.entity';
import { ChatSession } from '../entities/chat-session.entity';

export class ChatMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ChatRole }) role!: ChatRole;
  @ApiProperty() content!: string;
  @ApiProperty({ isArray: true }) actions!: AssistantAction[];
  @ApiProperty() createdAt!: Date;

  static from(m: ChatMessage): ChatMessageResponseDto {
    const dto = new ChatMessageResponseDto();
    dto.id = m.id;
    dto.role = m.role;
    dto.content = m.content;
    dto.actions = m.actions;
    dto.createdAt = m.createdAt;
    return dto;
  }
}

export class ChatSessionResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() title?: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiPropertyOptional({ type: [ChatMessageResponseDto] })
  messages?: ChatMessageResponseDto[];

  static from(
    s: ChatSession,
    messages?: ChatMessage[],
  ): ChatSessionResponseDto {
    const dto = new ChatSessionResponseDto();
    dto.id = s.id;
    dto.title = s.title;
    dto.createdAt = s.createdAt;
    dto.updatedAt = s.updatedAt;
    dto.messages = messages?.map((m) => ChatMessageResponseDto.from(m));
    return dto;
  }
}
