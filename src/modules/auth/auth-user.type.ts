import { UserRole } from '../users/entities/user.entity';

export type AuthUser = { id: string; email: string; role: UserRole };
