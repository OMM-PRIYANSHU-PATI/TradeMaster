import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { prisma } from 'database';
import * as crypto from 'crypto';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawSessionId = request.cookies['sessionId'];

    if (!rawSessionId) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const tokenHash = crypto.createHash('sha256').update(rawSessionId).digest('hex');
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: { user: { include: { roles: { include: { permissions: true } }, profile: true } } }
      });

      if (!session || session.expiresAt < new Date() || session.revokedAt) {
        throw new UnauthorizedException('Session invalid or expired');
      }

      request.user = session.user;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
