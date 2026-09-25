import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import type { PermissionId } from '../authorization/permission.js';
import { ApiKeyRepository, type OrganizationApiKey } from './api-key.js';

export class PrismaApiKeyRepository
  extends ApiKeyRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async create(apiKey: OrganizationApiKey) {
    return this.fromRecord(await this.client.apiKey.create({ data: apiKey }));
  }

  async find(id: string) {
    const apiKey = await this.client.apiKey.findUnique({ where: { id } });
    return apiKey ? this.fromRecord(apiKey) : undefined;
  }

  async revoke(input: { id: string; organizationId: string; revokedAt: Date }) {
    const result = await this.client.apiKey.updateMany({
      data: { revokedAt: input.revokedAt },
      where: {
        id: input.id,
        organizationId: input.organizationId,
        revokedAt: null,
      },
    });
    return result.count === 1;
  }

  rotate(input: {
    expiresAt: Date;
    id: string;
    organizationId: string;
    replacement: OrganizationApiKey;
  }) {
    return this.client.$transaction(async (transaction) => {
      const result = await transaction.apiKey.updateMany({
        data: { expiresAt: input.expiresAt },
        where: {
          expiresAt: null,
          id: input.id,
          organizationId: input.organizationId,
          revokedAt: null,
        },
      });
      if (result.count !== 1) return false;
      await transaction.apiKey.create({ data: input.replacement });
      return true;
    });
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  private fromRecord(apiKey: {
    createdAt: Date;
    createdByUserId: string;
    expiresAt: Date | null;
    id: string;
    name: string;
    organizationId: string;
    revokedAt: Date | null;
    scopes: string[];
    secretHash: string;
  }): OrganizationApiKey {
    return { ...apiKey, scopes: apiKey.scopes as PermissionId[] };
  }
}
