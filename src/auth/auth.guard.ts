import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { Role } from './roles.enum';

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization;

    if (!authorization) return false;

    const token = authorization.split(' ')[1];
    if (!token) return false;

    const secret = process.env.JWT_SECRET;

    try {
      // 🔑 Verificamos el token
      const payload = this.jwtService.verify(token, { secret });

      // 🔥 Ahora el payload trae isAdmin e isSuperAdmin porque los agregaste en el sign
      const user = {
        id: payload.sub,
        email: payload.email,
        isAdmin: payload.isAdmin,
        isSuperAdmin: payload.isSuperAdmin,
        roles: payload.isAdmin ? [Role.ADMIN] : [Role.USER],
        iat: new Date(payload.iat * 1000),
        exp: new Date(payload.exp * 1000),
      };

      request.user = user;

      console.log('✅ Usuario autenticado:', user);
      return true;
    } catch (error) {
      console.error('❌ Error al verificar token:', error);
      return false;
    }
  }
}
