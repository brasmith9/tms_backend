import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  role: string;
}

/**
 * Extracts and verifies the access token from a socket handshake (auth.token
 * or Authorization header). Returns the user id, or null when unauthenticated.
 */
export function authenticateSocket(
  socket: Socket,
  jwt: JwtService,
  config: ConfigService,
): string | null {
  const raw =
    (socket.handshake.auth?.token as string | undefined) ??
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!raw) return null;
  try {
    const secret = config.get<{ accessSecret: string }>('jwt')!.accessSecret;
    const payload = jwt.verify<JwtPayload>(raw, { secret });
    return payload.sub;
  } catch {
    return null;
  }
}
