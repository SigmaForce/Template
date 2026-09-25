import { ApiKeyRepository, type OrganizationApiKey } from './api-key.js';

export class MemoryApiKeyRepository extends ApiKeyRepository {
  readonly apiKeys = new Map<string, OrganizationApiKey>();

  async create(apiKey: OrganizationApiKey) {
    this.apiKeys.set(apiKey.id, apiKey);
    return apiKey;
  }

  async find(id: string, organizationId?: string) {
    const apiKey = this.apiKeys.get(id);
    return !organizationId || apiKey?.organizationId === organizationId
      ? apiKey
      : undefined;
  }

  async list(input: {
    before?: Pick<OrganizationApiKey, 'createdAt' | 'id'>;
    limit: number;
    organizationId: string;
  }) {
    return [...this.apiKeys.values()]
      .filter((apiKey) => apiKey.organizationId === input.organizationId)
      .sort(
        (left, right) =>
          right.createdAt.getTime() - left.createdAt.getTime() ||
          (right.id < left.id ? -1 : right.id > left.id ? 1 : 0),
      )
      .filter(
        (apiKey) =>
          !input.before ||
          apiKey.createdAt < input.before.createdAt ||
          (apiKey.createdAt.getTime() === input.before.createdAt.getTime() &&
            apiKey.id < input.before.id),
      )
      .slice(0, input.limit);
  }

  async revoke(input: { id: string; organizationId: string; revokedAt: Date }) {
    const apiKey = this.apiKeys.get(input.id);
    if (
      !apiKey ||
      apiKey.organizationId !== input.organizationId ||
      apiKey.revokedAt
    ) {
      return false;
    }
    apiKey.revokedAt = input.revokedAt;
    return true;
  }

  async rotate(input: {
    expiresAt: Date;
    id: string;
    organizationId: string;
    replacement: OrganizationApiKey;
  }) {
    const apiKey = this.apiKeys.get(input.id);
    if (
      !apiKey ||
      apiKey.organizationId !== input.organizationId ||
      apiKey.revokedAt ||
      apiKey.expiresAt
    ) {
      return false;
    }
    apiKey.expiresAt = input.expiresAt;
    this.apiKeys.set(input.replacement.id, input.replacement);
    return true;
  }
}
