import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuditEventsService } from '../audit-events/audit-events.service.js';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { ApiKeyRepository, type OrganizationApiKey } from './api-key.js';
import type { CreateApiKeyDto } from './api-key.dto.js';
import type { ListApiKeysQuery } from './list-api-keys.query.js';

const rotationOverlapMs = 5 * 60_000;
const cursorScope = 'organization-api-keys';

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly authorization: AuthorizationService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(
    user: AuthenticatedUser,
    organizationId: string,
    input: CreateApiKeyDto,
    idempotencyKey: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysIssue,
      targetOrganizationId: organizationId,
      user,
    });
    const id = this.idempotentId(
      scope.organizationId,
      'create',
      idempotencyKey,
    );
    if (await this.repository.find(id, scope.organizationId)) {
      throw PublicProblemException.idempotencyConflict();
    }
    const { apiKey, plaintext } = this.issue(
      user.id,
      scope.organizationId,
      input,
      id,
    );
    await this.auditEvents.record({
      action: 'organization.api-key.create-requested',
      actor: { id: user.id, type: 'user' },
      context: { name: apiKey.name, scopes: apiKey.scopes },
      organizationId: apiKey.organizationId,
      target: { id: apiKey.id, type: 'api-key' },
    });
    const created = await this.repository.create(apiKey);
    if (!created) throw PublicProblemException.idempotencyConflict();
    return { apiKey: this.toDto(created), plaintext };
  }

  async list(
    user: AuthenticatedUser,
    organizationId: string,
    query: ListApiKeysQuery,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysManage,
      targetOrganizationId: organizationId,
      user,
    });
    const before = query.cursor
      ? this.decodeCursor(query.cursor, scope.organizationId)
      : undefined;
    const apiKeys = await this.repository.list({
      before,
      limit: query.limit + 1,
      organizationId: scope.organizationId,
    });
    const hasNextPage = apiKeys.length > query.limit;
    const page = apiKeys.slice(0, query.limit);
    const lastApiKey = page.at(-1);
    return {
      items: page.map((apiKey) => this.toDto(apiKey)),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && lastApiKey
            ? this.encodeCursor(lastApiKey, scope.organizationId)
            : null,
      },
    };
  }

  async rotate(
    user: AuthenticatedUser,
    organizationId: string,
    apiKeyId: string,
    idempotencyKey: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysIssue,
      targetOrganizationId: organizationId,
      user,
    });
    const replacementId = this.idempotentId(
      scope.organizationId,
      `rotate:${apiKeyId}`,
      idempotencyKey,
    );
    if (await this.repository.find(replacementId, scope.organizationId)) {
      throw PublicProblemException.idempotencyConflict();
    }
    const current = await this.repository.find(apiKeyId, scope.organizationId);
    if (
      !current ||
      current.organizationId !== scope.organizationId ||
      current.revokedAt ||
      current.expiresAt
    ) {
      throw PublicProblemException.apiKeyUnavailable();
    }
    const { apiKey, plaintext } = this.issue(
      user.id,
      scope.organizationId,
      {
        name: current.name,
        scopes: current.scopes,
      },
      replacementId,
    );
    const expiresAt = new Date(Date.now() + rotationOverlapMs);
    await this.auditEvents.record({
      action: 'organization.api-key.rotate-requested',
      actor: { id: user.id, type: 'user' },
      context: {
        expiresAt: expiresAt.toISOString(),
        replacementApiKeyId: apiKey.id,
        scopes: apiKey.scopes,
      },
      organizationId: scope.organizationId,
      target: { id: current.id, type: 'api-key' },
    });
    const rotated = await this.repository.rotate({
      expiresAt,
      id: current.id,
      organizationId: scope.organizationId,
      replacement: apiKey,
    });
    if (!rotated) {
      if (await this.repository.find(replacementId, scope.organizationId)) {
        throw PublicProblemException.idempotencyConflict();
      }
      throw PublicProblemException.apiKeyUnavailable();
    }
    return { apiKey: this.toDto(apiKey), plaintext };
  }

  async revoke(
    user: AuthenticatedUser,
    organizationId: string,
    apiKeyId: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysManage,
      targetOrganizationId: organizationId,
      user,
    });
    const apiKey = await this.repository.find(apiKeyId, scope.organizationId);
    if (
      !apiKey ||
      apiKey.organizationId !== scope.organizationId ||
      apiKey.revokedAt
    ) {
      throw PublicProblemException.apiKeyUnavailable();
    }
    await this.auditEvents.record({
      action: 'organization.api-key.revoke-requested',
      actor: { id: user.id, type: 'user' },
      context: { name: apiKey.name, scopes: apiKey.scopes },
      organizationId: scope.organizationId,
      target: { id: apiKey.id, type: 'api-key' },
    });
    if (
      !(await this.repository.revoke({
        id: apiKey.id,
        organizationId: scope.organizationId,
        revokedAt: new Date(),
      }))
    ) {
      throw PublicProblemException.apiKeyUnavailable();
    }
  }

  private issue(
    userId: string,
    organizationId: string,
    input: Pick<CreateApiKeyDto, 'name' | 'scopes'>,
    id: string = randomUUID(),
  ) {
    const plaintext = `sak_${id}.${randomBytes(32).toString('base64url')}`;
    return {
      apiKey: {
        createdAt: new Date(),
        createdByUserId: userId,
        expiresAt: null,
        id,
        name: input.name,
        organizationId,
        revokedAt: null,
        scopes: input.scopes,
        secretHash: createHash('sha256').update(plaintext).digest('hex'),
      } satisfies OrganizationApiKey,
      plaintext,
    };
  }

  private idempotentId(
    organizationId: string,
    operation: string,
    idempotencyKey: string,
  ) {
    const hex = createHash('sha256')
      .update(JSON.stringify([organizationId, operation, idempotencyKey]))
      .digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }

  private encodeCursor(apiKey: OrganizationApiKey, organizationId: string) {
    return Buffer.from(
      JSON.stringify({
        createdAt: apiKey.createdAt.toISOString(),
        id: apiKey.id,
        organizationId,
        scope: cursorScope,
        version: 1,
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string, organizationId: string) {
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('version' in payload) ||
        payload.version !== 1 ||
        !('scope' in payload) ||
        payload.scope !== cursorScope ||
        !('organizationId' in payload) ||
        payload.organizationId !== organizationId ||
        !('id' in payload) ||
        typeof payload.id !== 'string' ||
        !('createdAt' in payload) ||
        typeof payload.createdAt !== 'string'
      ) {
        throw new Error('Invalid API Key cursor.');
      }
      const createdAt = new Date(payload.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error('Invalid API Key cursor time.');
      }
      return { createdAt, id: payload.id };
    } catch {
      throw PublicProblemException.validation([
        {
          detail: 'cursor is invalid for the requested API Key collection',
          pointer: '#/query/cursor',
        },
      ]);
    }
  }

  private toDto(apiKey: OrganizationApiKey) {
    const {
      createdByUserId: _createdByUserId,
      secretHash: _secretHash,
      ...dto
    } = apiKey;
    return {
      ...dto,
      createdAt: dto.createdAt.toISOString(),
      expiresAt: dto.expiresAt?.toISOString() ?? null,
      revokedAt: dto.revokedAt?.toISOString() ?? null,
    };
  }
}
