import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from '../../modules/auth/auth-user.type';
import { UserRole } from '../../modules/users/entities/user.entity';

export const OWNS_PARAM = 'owns_param';
/** Marks which route param holds the id whose owner must match the caller. */
export const Owns = (param: string) => SetMetadata(OWNS_PARAM, param);

export interface OwnerResolver {
  ownerIdFor(resourceId: string): Promise<string | null>;
}
export const OWNER_RESOLVER = 'OWNER_RESOLVER';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(OWNER_RESOLVER) private readonly resolver: OwnerResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const param = this.reflector.getAllAndOverride<string | undefined>(
      OWNS_PARAM,
      [context.getHandler(), context.getClass()],
    );
    if (!param) return true;
    const req = context.switchToHttp().getRequest<{
      user: AuthUser;
      params: Record<string, string>;
    }>();
    if (req.user.role === UserRole.ADMIN) return true; // admin bypass
    const ownerId = await this.resolver.ownerIdFor(req.params[param]);
    if (ownerId !== req.user.id) {
      throw new ForbiddenException('Not the resource owner');
    }
    return true;
  }
}
