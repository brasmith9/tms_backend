import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface UploadedImage {
  url: string;
  publicId: string;
}

/** Uploads images to Cloudinary and returns their secure URL. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly configured: boolean;

  constructor(configService: ConfigService) {
    const c = configService.get<CloudinaryConfig>('cloudinary')!;
    this.configured = Boolean(c.cloudName && c.apiKey && c.apiSecret);
    if (this.configured) {
      cloudinary.config({
        cloud_name: c.cloudName,
        api_key: c.apiKey,
        api_secret: c.apiSecret,
      });
    } else {
      this.logger.warn(
        'Cloudinary is not configured; image upload is disabled',
      );
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder = 'voyago',
  ): Promise<UploadedImage> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Image upload is not configured');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('No image file provided');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, uploaded) => {
          if (error || !uploaded) {
            reject(error instanceof Error ? error : new Error('Upload failed'));
            return;
          }
          resolve(uploaded);
        },
      );
      stream.end(file.buffer);
    });

    return { url: result.secure_url, publicId: result.public_id };
  }
}
