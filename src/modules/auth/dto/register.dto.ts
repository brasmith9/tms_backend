import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';
import {
  SELF_SELECTABLE_ROLES,
  UserRole,
} from '../../users/entities/user.entity';

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

  @ApiPropertyOptional({
    enum: SELF_SELECTABLE_ROLES,
    description:
      'Campus affiliation (SRS 2.3). Omit on the tourism app — the account ' +
      'then defaults to TOURIST. VENDOR and ADMIN cannot be self-declared.',
  })
  @IsOptional()
  @IsIn(SELF_SELECTABLE_ROLES)
  affiliation?: (typeof SELF_SELECTABLE_ROLES)[number];
}

/** Maps the self-declared affiliation onto a role, defaulting to TOURIST. */
export const roleForAffiliation = (dto: RegisterDto): UserRole =>
  dto.affiliation ?? UserRole.TOURIST;
