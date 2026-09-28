import { createPublicKey, verify } from 'node:crypto';
import type { OnModuleDestroy } from '@nestjs/common';
import {
  OperatorSessionVerifier,
  OperatorSessionRepository,
  operatorPermissions,
  type OperatorPermission,
} from './operator.js';

const permissionSet = new Set<string>(operatorPermissions);

export class JwtOperatorSessionVerifier
  extends OperatorSessionVerifier
  implements OnModuleDestroy
{
  private readonly publicKey: ReturnType<typeof createPublicKey>;

  constructor(
    publicKey: string,
    private readonly sessions: OperatorSessionRepository,
  ) {
    super();
    this.publicKey = createPublicKey(publicKey);
  }

  async verify(token: string) {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid Operator session.');
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = this.decode(encodedHeader);
    if (header.alg !== 'RS256' || header.typ !== 'JWT') {
      throw new Error('Invalid Operator session.');
    }
    if (
      !verify(
        'RSA-SHA256',
        Buffer.from(`${encodedHeader}.${encodedPayload}`),
        this.publicKey,
        Buffer.from(encodedSignature, 'base64url'),
      )
    ) {
      throw new Error('Invalid Operator session.');
    }

    const payload = this.decode(encodedPayload);
    const now = Math.floor(Date.now() / 1_000);
    if (
      payload.iss !== 'next-nest-saas-operators' ||
      payload.aud !== 'next-nest-saas-api' ||
      typeof payload.sub !== 'string' ||
      !/^operator_[A-Za-z0-9_]{1,55}$/.test(payload.sub) ||
      typeof payload.sid !== 'string' ||
      !/^opsess_[A-Za-z0-9_]{1,120}$/.test(payload.sid) ||
      !Number.isSafeInteger(payload.exp) ||
      (payload.exp as number) <= now ||
      !Number.isSafeInteger(payload.iat) ||
      (payload.iat as number) > now + 60 ||
      (payload.exp as number) <= (payload.iat as number) ||
      (payload.exp as number) - (payload.iat as number) > 15 * 60 ||
      !Number.isSafeInteger(payload.nbf) ||
      (payload.nbf as number) > now
    ) {
      throw new Error('Invalid Operator session.');
    }
    const session = await this.sessions.find(payload.sid);
    if (
      !session ||
      session.operatorId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now() ||
      (payload.exp as number) * 1_000 > session.expiresAt.getTime() ||
      !session.permissions.every((permission) =>
        permissionSet.has(permission),
      ) ||
      !session.organizationIds.every((organizationId) =>
        /^org_[A-Za-z0-9_]+$/.test(organizationId),
      )
    ) {
      throw new Error('Invalid Operator session.');
    }

    return {
      id: payload.sub,
      organizationIds: [...new Set(session.organizationIds)],
      permissions: [...new Set(session.permissions as OperatorPermission[])],
      sessionId: payload.sid,
    };
  }

  async onModuleDestroy() {
    await this.sessions.onModuleDestroy?.();
  }

  private decode(value: string): Record<string, unknown> {
    try {
      const decoded: unknown = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      );
      if (typeof decoded === 'object' && decoded !== null) {
        return decoded as Record<string, unknown>;
      }
    } catch {
      // Deliberately collapse parsing and verification failures at the boundary.
    }
    throw new Error('Invalid Operator session.');
  }
}
