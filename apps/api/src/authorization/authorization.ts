import type { OrganizationRole, PermissionId } from './permission.js';

export const Capability = {
  billing: 'billing',
  organizationMemberships: 'organization-memberships',
  organizationSettings: 'organization-settings',
} as const;

export type CapabilityId = (typeof Capability)[keyof typeof Capability];
export type OrganizationAccessState =
  'active' | 'pending-deletion' | 'read-only';
export type MembershipAccessStatus = 'active' | 'removed' | 'suspended';

export interface MembershipAccess {
  role?: OrganizationRole;
  status: MembershipAccessStatus;
}

export interface OrganizationAccess {
  state: OrganizationAccessState;
}

export interface MembershipIdentity {
  organizationId: string;
  userId: string;
}

export abstract class AuthorizationRepository {
  abstract findMembership(
    input: MembershipIdentity,
  ): Promise<MembershipAccess | undefined>;

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
  permission: PermissionId;
  targetOrganizationId: string;
  user:
    | {
        activeOrganization?: { id: string; role?: OrganizationRole };
        id: string;
      }
    | undefined;
}

export interface AuthorizedOrganizationScope {
  organizationId: string;
  role: OrganizationRole;
}
