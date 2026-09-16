import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AUTHENTICATED_USER,
  type AuthenticatedRequest,
  PUBLIC_ROUTE,
  SessionTokenVerifier,
} from './authentication.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: SessionTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);

    if (!match) throw PublicProblemException.authenticationRequired();

    try {
      request[AUTHENTICATED_USER] = await this.tokens.verify(match[1]);
      return true;
    } catch {
      throw PublicProblemException.authenticationRequired();
    }
  }
}
