import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/entities/user.entity';

function ctx(role: UserRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows when no roles are required', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(UserRole.TOURIST))).toBe(
      true,
    );
  });

  it('allows a user whose role is permitted', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.ADMIN],
    } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx(UserRole.ADMIN))).toBe(
      true,
    );
  });

  it('forbids a user whose role is not permitted', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.ADMIN],
    } as unknown as Reflector;
    expect(() =>
      new RolesGuard(reflector).canActivate(ctx(UserRole.TOURIST)),
    ).toThrow(ForbiddenException);
  });
});
