import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { ApiKeyTokenVerifier } from '../authentication/authentication.js';
import { ApiKeyRepository } from './api-key.js';

@Injectable()
export class ApiKeyVerifier extends ApiKeyTokenVerifier {
  constructor(private readonly apiKeys: ApiKeyRepository) {
    super();
  }

  async verify(token: string) {
    const match = token.match(
      /^sak_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[A-Za-z0-9_-]{43}$/,
    );
    if (!match) throw new Error('Invalid API Key.');
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
      id: apiKey.id,
      kind: 'api-key' as const,
      scopes: apiKey.scopes,
    };
  }
}
