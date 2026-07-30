import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Kofi Mensah' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+233201234567' })
  @IsOptional()
  @IsString()
  @Length(7, 20)
  phone?: string;
}
