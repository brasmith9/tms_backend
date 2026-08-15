import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ChatRequestDto {
  @ApiPropertyOptional({
    description:
      'Continue an existing conversation. Omit to start a new one — the ' +
      'reply carries the session id to send back next turn.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({
    example: 'Where is Commonwealth Hall and what can I eat nearby?',
  })
  @IsString()
  @Length(1, 2000)
  message!: string;
}
