import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class OpeningHourDto {
  @ApiProperty({ example: 1, description: '0 = Sunday … 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  day!: number;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'opens must be HH:mm' })
  opens!: string;

  @ApiProperty({ example: '22:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'closes must be HH:mm' })
  closes!: string;
}

export class CreateRestaurantDto {
  @ApiProperty({ example: 'Tyme Out Bar & Grill' })
  @IsString()
  @Length(2, 160)
  name!: string;

  @ApiProperty({ example: 'Ghanaian' }) @IsString() cuisine!: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  priceTier!: number;

  @ApiProperty({
    example: 'Student grill spot on the East Legon side of campus.',
  })
  @IsString()
  description!: string;

  @ApiProperty({ example: 5.6508 }) @IsLatitude() lat!: number;
  @ApiProperty({ example: -0.1869 }) @IsLongitude() lng!: number;

  @ApiPropertyOptional() @IsOptional() @IsString() heroImageUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: ['VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'],
  })
  @IsOptional()
  @IsArray()
  @IsIn(['VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'], { each: true })
  dietary?: string[];

  @ApiPropertyOptional({ type: [OpeningHourDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  openingHours?: OpeningHourDto[];

  @ApiPropertyOptional({
    description: 'Campus landmark this joint sits by',
    example: '3f1c…',
  })
  @IsOptional()
  @IsUUID()
  nearestLocationId?: string;

  @ApiPropertyOptional({
    example: '+233201234567',
    description: 'E.164 or local Ghanaian format',
  })
  @IsOptional()
  @IsPhoneNumber('GH')
  phone?: string;

  @ApiPropertyOptional({
    example: '233201110001',
    description:
      'Digits only — the client builds a wa.me/<number> link from it',
  })
  @IsOptional()
  @Matches(/^\d{7,15}$/, {
    message: 'whatsapp must be digits only, with no + or spaces',
  })
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'orders@tymeout.gh' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: true,
    description:
      'Must be true for the contact details above to be published on the API.',
  })
  @IsBoolean()
  contactConsent!: boolean;
}
