import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'kofi@example.com' }) @IsEmail() email!: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @Length(8, 128)
  password!: string;

  @ApiProperty({ example: 'Kofi Mensah' })
  @IsString()
  @Length(2, 120)
  fullName!: string;
}
