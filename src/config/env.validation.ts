import { plainToInstance } from 'class-transformer';
import { IsInt, IsString, IsUrl, Min, validateSync } from 'class-validator';

export class EnvVars {
  @IsInt() PORT!: number;
  @IsString() CORS_ORIGINS!: string;
  @IsString() DATABASE_URL!: string;
  @IsString() JWT_ACCESS_SECRET!: string;
  @IsString() JWT_ACCESS_TTL!: string;
  @IsString() JWT_REFRESH_SECRET!: string;
  @IsString() JWT_REFRESH_TTL!: string;
  @IsString() PAYSTACK_SECRET_KEY!: string;
  @IsString() PAYSTACK_PUBLIC_KEY!: string;
  @IsUrl({ require_tld: false }) PAYSTACK_BASE_URL!: string;
  @IsInt() @Min(1) SEAT_HOLD_MINUTES!: number;
  @IsInt() @Min(1) CANCELLATION_WINDOW_HOURS!: number;
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const validated = plainToInstance(EnvVars, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment: ${errors.map((e) => e.property).join(', ')}`,
    );
  }
  return validated;
}
