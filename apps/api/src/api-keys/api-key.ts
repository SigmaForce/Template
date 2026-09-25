import type { PermissionId } from '../authorization/permission.js';

export interface OrganizationApiKey {
  createdAt: Date;
  createdByUserId: string;
  expiresAt: Date | null;
  id: string;
  name: string;
  organizationId: string;
  revokedAt: Date | null;
  scopes: PermissionId[];
  secretHash: string;
}

export abstract class ApiKeyRepository {
  abstract create(apiKey: OrganizationApiKey): Promise<OrganizationApiKey>;
  abstract find(id: string): Promise<OrganizationApiKey | undefined>;
  abstract list(organizationId: string): Promise<OrganizationApiKey[]>;
  abstract revoke(input: {
    id: string;
    organizationId: string;
    revokedAt: Date;
  }): Promise<boolean>;
  abstract rotate(input: {
    expiresAt: Date;
    id: string;
    organizationId: string;
    replacement: OrganizationApiKey;
  }): Promise<boolean>;
}
