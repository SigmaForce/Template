import { Injectable } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { AuditEventsService } from '../audit-events/audit-events.service.js';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { ApiKeyRepository, type OrganizationApiKey } from './api-key.js';
import type { CreateApiKeyDto } from './api-key.dto.js';

const rotationOverlapMs = 5 * 60_000;

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
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysManage,
      targetOrganizationId: organizationId,
      user,
    });
    const { apiKey, plaintext } = this.issue(
      user.id,
      scope.organizationId,
      input,
    );
    await this.auditEvents.record({
      action: 'organization.api-key.create-requested',
      actor: { id: user.id, type: 'user' },
      context: { name: apiKey.name, scopes: apiKey.scopes },
      organizationId: apiKey.organizationId,
      target: { id: apiKey.id, type: 'api-key' },
    });
    return {
      apiKey: this.toDto(await this.repository.create(apiKey)),
      plaintext,
    };
  }

  async list(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysManage,
      targetOrganizationId: organizationId,
      user,
    });
    return {
      items: (await this.repository.list(scope.organizationId)).map((apiKey) =>
        this.toDto(apiKey),
      ),
    };
  }

  async rotate(
    user: AuthenticatedUser,
    organizationId: string,
    apiKeyId: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationApiKeysManage,
      targetOrganizationId: organizationId,
      user,
    });
    const current = await this.repository.find(apiKeyId);
    if (
      !current ||
      current.organizationId !== scope.organizationId ||
      current.revokedAt ||
      current.expiresAt
    ) {
      throw PublicProblemException.apiKeyUnavailable();
    }
    const { apiKey, plaintext } = this.issue(user.id, scope.organizationId, {
      name: current.name,
      scopes: current.scopes,
    });
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
    if (
      !(await this.repository.rotate({
        expiresAt,
        id: current.id,
        organizationId: scope.organizationId,
        replacement: apiKey,
      }))
    ) {
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
    const apiKey = await this.repository.find(apiKeyId);
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
  ) {
    const id = randomUUID();
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
