import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: {
    findByEmail: jest.Mock;
    createUser: jest.Mock;
    findById: jest.Mock;
  };
  let tokens: {
    create: jest.Mock;
    findActiveByHash: jest.Mock;
    revoke: jest.Mock;
  };
  let resetTokens: {
    create: jest.Mock;
    findActiveByHash: jest.Mock;
    markUsed: jest.Mock;
  };
  let mail: { sendPasswordReset: jest.Mock };

  beforeEach(async () => {
    users = {
      findByEmail: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
    };
    tokens = {
      create: jest.fn(),
      findActiveByHash: jest.fn(),
      revoke: jest.fn(),
    };
    resetTokens = {
      create: jest.fn(),
      findActiveByHash: jest.fn(),
      markUsed: jest.fn(),
    };
    mail = { sendPasswordReset: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: RefreshTokenRepository, useValue: tokens },
        { provide: PasswordResetTokenRepository, useValue: resetTokens },
        { provide: MailService, useValue: mail },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('jwt'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(() => ({
              accessSecret: 's',
              accessTtl: '15m',
              refreshSecret: 'r',
              refreshTtl: '7d',
            })),
          },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('rejects registration when the email already exists', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1' });
    await expect(
      service.register({
        email: 'a@b.com',
        password: 'password123',
        fullName: 'A',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('hashes the password with argon2 on registration', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.createUser.mockImplementation((u: Record<string, unknown>) =>
      Promise.resolve({ ...u, id: 'u1', role: UserRole.TOURIST }),
    );
    tokens.create.mockResolvedValue(undefined);
    await service.register({
      email: 'a@b.com',
      password: 'password123',
      fullName: 'A',
    });
    const saved = users.createUser.mock.calls[0][0] as { passwordHash: string };
    expect(saved.passwordHash).not.toBe('password123');
    expect(await argon2.verify(saved.passwordHash, 'password123')).toBe(true);
  });

  it('rejects login with a wrong password', async () => {
    const hash = await argon2.hash('correct');
    users.findByEmail.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      role: UserRole.TOURIST,
      passwordHash: hash,
    });
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rotates the refresh token on refresh', async () => {
    tokens.findActiveByHash.mockResolvedValue({
      id: 'rt1',
      userId: 'u1',
      expiresAt: new Date(Date.now() + 1e9),
    });
    users.findById.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      role: UserRole.TOURIST,
    });
    await service.refresh('raw');
    expect(tokens.revoke).toHaveBeenCalledWith('rt1');
    expect(tokens.create).toHaveBeenCalled();
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.forgotPassword('ghost@b.com'),
    ).resolves.toBeUndefined();
    expect(resetTokens.create).not.toHaveBeenCalled();
    expect(mail.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('issues a reset token and emails it when the user exists', async () => {
    users.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    await service.forgotPassword('a@b.com');
    expect(resetTokens.create).toHaveBeenCalled();
    expect(mail.sendPasswordReset).toHaveBeenCalledWith(
      'a@b.com',
      expect.stringContaining('token='),
    );
  });

  it('rejects reset with an invalid or expired token', async () => {
    resetTokens.findActiveByHash.mockResolvedValue(null);
    await expect(service.resetPassword('bad', 'newPass123')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
