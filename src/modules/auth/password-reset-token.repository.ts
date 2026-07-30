import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
  ) {}

  create(input: Partial<PasswordResetToken>): Promise<PasswordResetToken> {
    return this.repo.save(this.repo.create(input));
  }

  findActiveByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repo.findOne({ where: { tokenHash, usedAt: IsNull() } });
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update({ id }, { usedAt: new Date() });
  }
}
