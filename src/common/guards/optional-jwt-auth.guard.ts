import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { AuthUser } from '../../modules/auth/auth-user.type';

/**
 * Authenticates when a bearer token is present and simply carries on when it is
 * not. Used by routes that must serve guests — the handler reads `user` as
 * possibly-undefined rather than relying on the guard to reject.
 *
 * A malformed or expired token still yields no user rather than a 401, so a
 * stale token in a client never blocks the guest path.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthUser | undefined>(
    _err: unknown,
    user: TUser | false,
  ): TUser | undefined {
    return user === false ? undefined : user;
  }
}
