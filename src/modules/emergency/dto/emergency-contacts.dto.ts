import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { EmergencyContact } from '../entities/emergency-contact.entity';

export class EmergencyContactInputDto {
  @ApiProperty({ example: 'Ama Mensah' })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: '+233201234567' })
  @IsString()
  @Length(7, 20)
  phone!: string;

  @ApiPropertyOptional({
    example: 'ama@example.com',
    description:
      'If set, this contact is emailed on SOS (SMS is not yet wired)',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Sister' })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  relationship?: string;
}

export class ReplaceEmergencyContactsDto {
  @ApiProperty({ type: [EmergencyContactInputDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => EmergencyContactInputDto)
  contacts!: EmergencyContactInputDto[];
}

export class EmergencyContactResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ required: false }) email?: string;
  @ApiProperty({ required: false }) relationship?: string;

  static from(c: EmergencyContact): EmergencyContactResponseDto {
    const dto = new EmergencyContactResponseDto();
    dto.id = c.id;
    dto.name = c.name;
    dto.phone = c.phone;
    dto.email = c.email;
    dto.relationship = c.relationship;
    return dto;
  }
}
