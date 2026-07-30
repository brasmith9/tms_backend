import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

const repoMock = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  createUser: jest.fn(),
  save: jest.fn(),
  addPoints: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    repo = repoMock();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repo }],
    }).compile();
    service = module.get(UsersService);
  });

  it('throws NotFound when the user id is unknown', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates only provided profile fields', async () => {
    const user = {
      id: 'u1',
      fullName: 'Old',
      phone: '1',
      role: UserRole.TOURIST,
    } as User;
    repo.findById.mockResolvedValue(user);
    repo.save.mockImplementation((u: User) => Promise.resolve(u));
    const result = await service.updateProfile('u1', { fullName: 'New' });
    expect(result.fullName).toBe('New');
    expect(result.phone).toBe('1');
  });
});
