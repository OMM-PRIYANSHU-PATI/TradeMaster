import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());

    if (!requiredRoles && !requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Access denied');

    const userRoles = user.roles.map((r: any) => r.name);
    const userPermissions = user.roles.flatMap((r: any) => r.permissions.map((p: any) => p.name));

    if (requiredRoles && !requiredRoles.some((role: string) => userRoles.includes(role))) {
       throw new ForbiddenException('Insufficient role');
    }

    if (requiredPermissions && !requiredPermissions.every((perm: string) => userPermissions.includes(perm))) {
       throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
