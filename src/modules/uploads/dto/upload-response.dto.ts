import { ApiProperty } from '@nestjs/swagger';
import { UploadedImage } from '../storage.service';

export class UploadResponseDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v1/voyago/abc.jpg',
  })
  url!: string;

  @ApiProperty({ example: 'voyago/abc' }) publicId!: string;

  static from(u: UploadedImage): UploadResponseDto {
    const dto = new UploadResponseDto();
    dto.url = u.url;
    dto.publicId = u.publicId;
    return dto;
  }
}
