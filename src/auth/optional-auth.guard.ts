import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  // Don’t throw when there’s no token; just continue as guest.
  canActivate(context: ExecutionContext) {
    return super.canActivate(context) as any;
  }
  handleRequest(err: unknown, user: any) {
    // If invalid/missing token, return null user instead of error.
    return user ?? null;
  }
}