import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The reset token from the email link' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'newPassword123', minLength: 8 })
  @IsString()
  @Length(8, 128)
  password!: string;
}
