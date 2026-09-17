import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PublicProblemException } from '../http/problem-details.js';
import {
  RequestRateLimiter,
  type RateLimitDecision,
} from './request-rate-limiter.js';
import {
  AUTHENTICATED_USER,
  type AuthenticatedUser,
  type AuthenticatedRequest,
  PUBLIC_ROUTE,
  SessionTokenVerifier,
} from './authentication.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: SessionTokenVerifier,
    private readonly rateLimiter: RequestRateLimiter,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse();
    if (isPublic) {
      this.enforceRateLimit(
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
      this.enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'anonymous',
          request.socket.remoteAddress ?? 'unknown',
        ),
      );
      throw PublicProblemException.authenticationRequired();
    }

    let user: AuthenticatedUser;
    try {
      user = await this.tokens.verify(match[1]);
    } catch {
      this.enforceRateLimit(
        response,
        this.rateLimiter.consume(
          'anonymous',
          request.socket.remoteAddress ?? 'unknown',
        ),
      );
      throw PublicProblemException.authenticationRequired();
    }

    request[AUTHENTICATED_USER] = user;
    this.enforceRateLimit(response, this.rateLimiter.consume('user', user.id));
    if (user.activeOrganization) {
      this.enforceRateLimit(
        response,
        this.rateLimiter.consume('organization', user.activeOrganization.id),
      );
    }
    return true;
  }

  private enforceRateLimit(
    response: { setHeader(name: string, value: string): void },
    decision: RateLimitDecision,
  ) {
    response.setHeader('ratelimit-limit', String(decision.limit));
    response.setHeader('ratelimit-remaining', String(decision.remaining));
    response.setHeader(
      'ratelimit-reset',
      String(Math.ceil(decision.resetAt / 1000)),
    );
    if (decision.allowed) return;

    response.setHeader(
      'retry-after',
      String(Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))),
    );
    throw PublicProblemException.rateLimited();
  }
}
