import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from './auth-user.type';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenRepository } from './refresh-token.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

export type AuthTokens = { accessToken: string; refreshToken: string };

type JwtConfig = {
  accessSecret: string;
  accessTtl: string;
  refreshSecret: string;
  refreshTtl: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.createUser({
      email: dto.email,
      passwordHash: await argon2.hash(dto.password),
      fullName: dto.fullName,
      role: UserRole.TOURIST,
    });
    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async refresh(rawToken: string): Promise<AuthTokens> {
    const record = await this.refreshTokens.findActiveByHash(
      this.hash(rawToken),
    );
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    await this.refreshTokens.revoke(record.id); // rotation
    const user = await this.users.findById(record.userId);
    return this.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async logout(rawToken: string): Promise<void> {
    const record = await this.refreshTokens.findActiveByHash(
      this.hash(rawToken),
    );
    if (record) await this.refreshTokens.revoke(record.id);
  }

  private async issueTokens(user: AuthUser): Promise<AuthTokens> {
    const jwtCfg = this.config.get<JwtConfig>('jwt')!;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: jwtCfg.accessSecret,
        expiresIn: jwtCfg.accessTtl as JwtSignOptions['expiresIn'],
      },
    );
    const rawRefresh = randomBytes(48).toString('hex');
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.hash(rawRefresh),
      expiresAt: this.ttlToDate(jwtCfg.refreshTtl),
    });
    return { accessToken, refreshToken: rawRefresh };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private ttlToDate(ttl: string): Date {
    const days = ttl.endsWith('d') ? parseInt(ttl, 10) : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}
