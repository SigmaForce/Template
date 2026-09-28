import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { PublicProblemException } from '../http/problem-details.js';
import type { OrganizationRole } from '../authorization/permission.js';
import type { PermissionId } from '../authorization/permission.js';

export interface AuthenticatedUser {
  activeOrganization?: ActiveOrganization;
  id: string;
  kind?: 'user';
}

export interface AuthenticatedApiKey {
  activeOrganization: Pick<ActiveOrganization, 'id'>;
  id: string;
  kind: 'api-key';
  scopes: PermissionId[];
}

export type AuthenticatedPrincipal = AuthenticatedApiKey | AuthenticatedUser;

export interface ActiveOrganization {
  id: string;
  role?: OrganizationRole;
  slug?: string;
}

export interface AuthenticationOptions {
  authorizedParties: string[];
  jwtKey?: string;
  rateLimit?: RequestRateLimitOptions;
  secretKey?: string;
}

export interface RequestRateLimitOptions {
  anonymous: number;
  organization: number;
  user: number;
  windowMs: number;
}

export abstract class SessionTokenVerifier {
  abstract verify(token: string): Promise<AuthenticatedUser>;
}

export abstract class ApiKeyTokenVerifier {
  abstract verify(token: string): Promise<AuthenticatedApiKey>;
}

export const PUBLIC_ROUTE = Symbol('public-route');
export const OPERATOR_ROUTE = Symbol('operator-route');
export const AUTHENTICATED_USER = Symbol('authenticated-user');

export type AuthenticatedRequest = Request & {
  [AUTHENTICATED_USER]?: AuthenticatedPrincipal;
};

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request[AUTHENTICATED_USER];

    if (!user || user.kind === 'api-key') {
      throw new Error('Authenticated User is unavailable.');
    }

    return user;
  },
);

export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedPrincipal => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request[AUTHENTICATED_USER];
    if (!principal) throw new Error('Authenticated principal is unavailable.');
    return principal;
  },
);

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ActiveOrganization => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const organization = request[AUTHENTICATED_USER]?.activeOrganization;

    if (!organization) {
      throw PublicProblemException.activeOrganizationRequired();
    }

    return organization;
  },
);
