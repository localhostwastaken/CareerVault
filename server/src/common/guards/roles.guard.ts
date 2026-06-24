import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type AppRole, ROLES_KEY } from '../decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../types/authenticated-user.js';

// Checks @Roles(...) against the user's effective roles. Every authenticated user is
// implicitly a HOLDER; org roles come from active memberships. Role *presence* only —
// per-org scoping is enforced in services via the active org context.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>().user;
    if (!user) throw new ForbiddenException('Authentication required');

    const effective = new Set<AppRole>([
      'HOLDER',
      ...user.memberships.map((m) => m.role as AppRole),
    ]);
    if (!required.some((role) => effective.has(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
