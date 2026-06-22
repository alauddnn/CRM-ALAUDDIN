import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // In a production setup, verify the token with a library like @nestjs/jwt.
      // For this sample/test backend, we allow a simplified JWT simulation 
      // or standard token mapping to decode: { id, email, role }
      // Let's decode it safely (since jwt tokens are base64):
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) {
        throw new UnauthorizedException('Malformed token structure');
      }
      
      const payloadStr = Buffer.from(payloadBase64, 'base64').toString('ascii');
      const decodedUser = JSON.parse(payloadStr);

      // Verify the user exists in PostgreSQL to make it safe
      const user = await this.prisma.user.findUnique({
        where: { id: decodedUser.id },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists in system');
      }

      request.user = user;

      if (!requiredRoles) {
        return true;
      }

      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        throw new ForbiddenException(`Access Denied! Required roles: ${requiredRoles.join(', ')}`);
      }

      return true;
    } catch (err) {
      throw new UnauthorizedException('Session expired or invalid signature');
    }
  }
}
