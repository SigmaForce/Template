import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiKeyRepository } from '../api-keys/api-key.js';
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
    @Optional() private readonly apiKeys?: ApiKeyRepository,
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
      user = match[1].startsWith('sak_')
        ? await this.verifyApiKey(match[1])
        : await this.tokens.verify(match[1]);
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

  private async verifyApiKey(token: string): Promise<AuthenticatedUser> {
    const match = token.match(
      /^sak_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[A-Za-z0-9_-]{43}$/,
    );
    if (!match) throw new Error('Invalid API Key.');
    if (!this.apiKeys) throw new Error('API Keys are unavailable.');
    const apiKey = await this.apiKeys.find(match[1]);
    const presentedHash = createHash('sha256').update(token).digest();
    const storedHash = apiKey
      ? Buffer.from(apiKey.secretHash, 'hex')
      : Buffer.alloc(presentedHash.length);
    if (
      !apiKey ||
      storedHash.length !== presentedHash.length ||
      !timingSafeEqual(storedHash, presentedHash) ||
      apiKey.revokedAt ||
      (apiKey.expiresAt && apiKey.expiresAt <= new Date())
    ) {
      throw new Error('Invalid API Key.');
    }
    return {
      activeOrganization: { id: apiKey.organizationId },
      apiKey: { scopes: apiKey.scopes },
      id: apiKey.id,
    };
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
