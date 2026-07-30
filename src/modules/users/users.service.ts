import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  createUser(input: Partial<User>): Promise<User> {
    return this.users.createUser(input);
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.findById(id);
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    return this.users.save(user);
  }

  addLoyaltyPoints(
    id: string,
    points: number,
    manager?: EntityManager,
  ): Promise<void> {
    return this.users.addPoints(id, points, manager);
  }

  async setPassword(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    user.passwordHash = passwordHash;
    await this.users.save(user);
  }
}
