import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  createUser(input: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(input));
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async addPoints(
    id: string,
    points: number,
    manager?: EntityManager,
  ): Promise<void> {
    const r = manager ? manager.getRepository(User) : this.repo;
    await r.increment({ id }, 'loyaltyPoints', points);
  }
}
