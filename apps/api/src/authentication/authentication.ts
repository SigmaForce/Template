import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticationOptions {
  authorizedParties: string[];
  jwtKey?: string;
  secretKey?: string;
}

export abstract class SessionTokenVerifier {
  abstract verify(token: string): Promise<AuthenticatedUser>;
}

export const PUBLIC_ROUTE = Symbol('public-route');
export const AUTHENTICATED_USER = Symbol('authenticated-user');

export type AuthenticatedRequest = Request & {
  [AUTHENTICATED_USER]?: AuthenticatedUser;
};

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request[AUTHENTICATED_USER];

    if (!user) {
      throw new Error('Authenticated User is unavailable.');
    }

    return user;
  },
);
