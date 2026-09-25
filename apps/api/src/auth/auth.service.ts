import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { prisma } from 'database';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  async register(data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await argon2.hash(data.password);

    // Give default USER role, creating it if missing just in case for phase 1
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        profile: { create: { firstName: '', lastName: '' } },
        roles: {
          connectOrCreate: {
            where: { name: 'USER' },
            create: { name: 'USER' }
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        event: 'USER_REGISTERED',
      }
    });

    return this.createSession(user.id);
  }

  async login(data: any) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      await prisma.auditLog.create({ data: { event: 'LOGIN_FAILURE', details: { reason: 'unknown_email' } } });
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, data.password);
    if (!valid) {
      await prisma.auditLog.create({ data: { userId: user.id, event: 'LOGIN_FAILURE', details: { reason: 'wrong_password' } } });
      throw new UnauthorizedException('Invalid credentials');
    }

    await prisma.auditLog.create({ data: { userId: user.id, event: 'LOGIN_SUCCESS' } });
    return this.createSession(user.id);
  }

  async logout(rawSessionId: string) {
    if (!rawSessionId) return;
    const tokenHash = crypto.createHash('sha256').update(rawSessionId).digest('hex');
    const session = await prisma.session.findUnique({ where: { tokenHash } });
    
    if (session && !session.revokedAt) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      await prisma.auditLog.create({ data: { userId: session.userId, event: 'LOGOUT' } });
    }
  }

  private async createSession(userId: string) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      }
    });

    return rawToken;
  }
}
