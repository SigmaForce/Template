import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicProblemException } from '../http/problem-details.js';
import {
  enforceRateLimit,
  RequestRateLimiter,
} from './request-rate-limiter.js';
import {
  AUTHENTICATED_USER,
  ApiKeyTokenVerifier,
  type AuthenticatedPrincipal,
  type AuthenticatedRequest,
  OPERATOR_ROUTE,
  PUBLIC_ROUTE,
  SessionTokenVerifier,
} from './authentication.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: SessionTokenVerifier,
    private readonly rateLimiter: RequestRateLimiter,
    private readonly apiKeys: ApiKeyTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    const isOperator = this.reflector.getAllAndOverride<boolean>(
      OPERATOR_ROUTE,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse();
    if (isOperator) {
      response.setHeader('cache-control', 'private, no-store');
      return true;
    }
    if (isPublic) {
      enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'anonymous',
          request.socket.remoteAddress ?? 'unknown',
        ),
      );
      return true;
    }

    response.setHeader('cache-control', 'private, no-store');
    const authorization = request.header('authorization');
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);

    if (!match) {
      enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'anonymous',
          request.socket.remoteAddress ?? 'unknown',
        ),
      );
      throw PublicProblemException.authenticationRequired();
    }

    let principal: AuthenticatedPrincipal;
    try {
      principal = match[1].startsWith('sak_')
        ? await this.apiKeys.verify(match[1])
        : await this.tokens.verify(match[1]);
    } catch {
      enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'anonymous',
          request.socket.remoteAddress ?? 'unknown',
        ),
      );
      throw PublicProblemException.authenticationRequired();
    }

    request[AUTHENTICATED_USER] = principal;
    enforceRateLimit(response, this.rateLimiter.consume('user', principal.id));
    if (principal.activeOrganization) {
      enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'organization',
          principal.activeOrganization.id,
        ),
      );
    }
    return true;
  }
}
