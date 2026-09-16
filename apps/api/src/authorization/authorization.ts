import type { OrganizationRole, PermissionId } from './permission.js';

export const Capability = {
  organizationSettings: 'organization-settings',
} as const;

export type CapabilityId = (typeof Capability)[keyof typeof Capability];
export type OrganizationAccessState =
  'active' | 'pending-deletion' | 'read-only';
export type MembershipAccessStatus = 'active' | 'suspended';

export interface MembershipAccess {
  role: OrganizationRole;
  status: MembershipAccessStatus;
}

export interface OrganizationAccess {
  id: string;
  state: OrganizationAccessState;
}

export abstract class AuthorizationRepository {
  abstract findMembership(input: {
    organizationId: string;
    userId: string;
  }): Promise<MembershipAccess | undefined>;

  abstract findOrganization(
    organizationId: string,
  ): Promise<OrganizationAccess | undefined>;
}

export abstract class CapabilityPolicy {
  abstract isEnabled(input: {
    capability: CapabilityId;
    organizationId: string;
  }): Promise<boolean>;
}

export class FoundationCapabilityPolicy extends CapabilityPolicy {
  async isEnabled() {
    return true;
  }
}

export interface AuthorizeOrganizationOperation {
  capability: CapabilityId;
  mode: 'read' | 'write';
  permission: PermissionId;
  targetOrganizationId: string;
  user:
    | { activeOrganization?: { id: string; role?: string }; id: string }
    | undefined;
}

export interface AuthorizedOrganizationScope {
  organizationId: string;
  permission: PermissionId;
  role: OrganizationRole;
  userId: string;
}
