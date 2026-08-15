import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuItemDto {
  @ApiProperty({ example: 'Jollof with grilled chicken' })
  @IsString()
  @Length(1, 160)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;

  @ApiProperty({ example: 35.5, description: 'Price in GHS, up to 2 decimals' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ description: 'Photo of the dish' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}

export class MenuSectionDto {
  @ApiProperty({ example: 'Mains' })
  @IsString()
  @Length(1, 80)
  category!: string;

  @ApiProperty({ type: [MenuItemDto] })
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items!: MenuItemDto[];
}

/** Whole-menu replacement — PUT semantics, the body is the new menu. */
export class UpdateMenuDto {
  @ApiProperty({ type: [MenuSectionDto] })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => MenuSectionDto)
  sections!: MenuSectionDto[];
}
