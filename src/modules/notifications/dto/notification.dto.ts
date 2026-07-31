import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Notification } from '../entities/notification.entity';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only unread notifications' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}

export class NotificationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'BOOKING' }) type!: string;
  @ApiProperty() title!: string;
  @ApiProperty() body!: string;
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: Record<string, unknown>;
  @ApiProperty() read!: boolean;
  @ApiProperty() createdAt!: Date;

  static from(n: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = n.id;
    dto.type = n.type;
    dto.title = n.title;
    dto.body = n.body;
    dto.data = n.data;
    dto.read = n.read;
    dto.createdAt = n.createdAt;
    return dto;
  }
}
