import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OPERATOR_ROUTE } from '../authentication/authentication.js';
import {
  enforceRateLimit,
  RequestRateLimiter,
} from '../authentication/request-rate-limiter.js';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AUTHENTICATED_OPERATOR,
  OPERATOR_CREDENTIAL,
  type OperatorRequest,
  OperatorSessionVerifier,
} from './operator.js';

@Injectable()
export class OperatorAuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: OperatorSessionVerifier,
    private readonly rateLimiter: RequestRateLimiter,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isOperator = this.reflector.getAllAndOverride<boolean>(
      OPERATOR_ROUTE,
      [context.getHandler(), context.getClass()],
    );
    if (!isOperator) return true;

    const request = context.switchToHttp().getRequest<OperatorRequest>();
    const response = context.switchToHttp().getResponse();
    const match = request.header('authorization')?.match(/^Bearer ([^\s]+)$/i);
    if (!match) this.reject(request, response);

    let operator;
    try {
      operator = await this.sessions.verify(match[1]);
    } catch {
      this.reject(request, response);
    }
    request[AUTHENTICATED_OPERATOR] = operator;
    request[OPERATOR_CREDENTIAL] = match[1];
    enforceRateLimit(
      response,
      this.rateLimiter.consume('user', `operator:${operator.id}`),
    );
    const organizationId = request.params.organizationId;
    if (
      typeof organizationId === 'string' &&
      operator.organizationIds.includes(organizationId)
    ) {
      enforceRateLimit(
        response,
        this.rateLimiter.consume('organization', organizationId),
      );
    }
    return true;
  }

  private reject(
    request: OperatorRequest,
    response: { setHeader(name: string, value: string): void },
  ): never {
    enforceRateLimit(
      response,
      this.rateLimiter.consume(
        'anonymous',
        request.socket.remoteAddress ?? 'unknown',
      ),
    );
    throw PublicProblemException.authenticationRequired();
  }
}
