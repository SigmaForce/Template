import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { OPERATOR_ROUTE } from '../authentication/authentication.js';

export const operatorPermissions = [
  'billing:subscriptions:reconcile',
  'billing:subscriptions:repair',
] as const;

export type OperatorPermission = (typeof operatorPermissions)[number];

export interface OperatorSession {
  id: string;
  organizationIds: string[];
  permissions: OperatorPermission[];
  sessionId: string;
}

export interface StoredOperatorSession {
  expiresAt: Date;
  id: string;
  operatorId: string;
  organizationIds: string[];
  permissions: OperatorPermission[];
  revokedAt: Date | null;
}

export abstract class OperatorSessionRepository {
  abstract find(id: string): Promise<StoredOperatorSession | undefined>;
  abstract revoke(id: string, revokedAt: Date): Promise<boolean>;
  onModuleDestroy?(): Promise<void>;
}

export abstract class OperatorSessionVerifier {
  abstract verify(token: string): Promise<OperatorSession>;
}

export const AUTHENTICATED_OPERATOR = Symbol('authenticated-operator');
export const OPERATOR_CREDENTIAL = Symbol('operator-credential');

export type OperatorRequest = Request & {
  [AUTHENTICATED_OPERATOR]?: OperatorSession;
  [OPERATOR_CREDENTIAL]?: string;
};

export const OperatorRoute = () => SetMetadata(OPERATOR_ROUTE, true);

export const CurrentOperatorCredential = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const credential = context.switchToHttp().getRequest<OperatorRequest>()[
      OPERATOR_CREDENTIAL
    ];
    if (!credential) throw new Error('Operator credential is unavailable.');
    return credential;
  },
);
