import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty({ required: false }) phone?: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty() loyaltyPoints!: number;

  static from(u: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = u.id;
    dto.email = u.email;
    dto.fullName = u.fullName;
    dto.phone = u.phone;
    dto.role = u.role;
    dto.loyaltyPoints = u.loyaltyPoints;
    return dto;
  }
}
