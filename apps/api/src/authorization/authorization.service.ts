import { Injectable } from '@nestjs/common';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AuthorizationRepository,
  Capability,
  CapabilityPolicy,
  type AuthorizeOrganizationOperation,
  type AuthorizedOrganizationScope,
  type OrganizationAccess,
} from './authorization.js';
import {
  Permission,
  organizationStateAllows,
  roleHasPermission,
  type OrganizationRole,
  type PermissionId,
} from './permission.js';

interface ActiveAccessContext {
  activeOrganization: { id: string };
  organization: OrganizationAccess;
  role: OrganizationRole;
}

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly capabilities: CapabilityPolicy,
  ) {}

  async authorize(
    operation: AuthorizeOrganizationOperation,
  ): Promise<AuthorizedOrganizationScope> {
    const context = await this.loadActiveAccess(operation.user);
    if (
      !context ||
      !organizationStateAllows(context.organization.state, operation.permission)
    ) {
      throw PublicProblemException.permissionDenied();
    }

    if (
      !(await this.capabilities.isEnabled({
        capability: operation.capability,
        organizationId: context.activeOrganization.id,
      }))
    ) {
      throw PublicProblemException.permissionDenied();
    }

    if (!roleHasPermission(context.role, operation.permission)) {
      throw PublicProblemException.permissionDenied();
    }

    if (operation.targetOrganizationId !== context.activeOrganization.id) {
      throw PublicProblemException.permissionDenied();
    }

    return {
      organizationId: context.activeOrganization.id,
    };
  }

  async permissionsForActiveOrganization(user: {
    activeOrganization?: { id: string; role?: OrganizationRole };
    id: string;
  }): Promise<PermissionId[]> {
    const context = await this.loadActiveAccess(user);
    if (!context) return [];

    const settingsEnabled = await this.capabilities.isEnabled({
      capability: Capability.organizationSettings,
      organizationId: context.activeOrganization.id,
    });

    return Object.values(Permission).filter(
      (permission) =>
        organizationStateAllows(context.organization.state, permission) &&
        (settingsEnabled ||
          (permission !== Permission.organizationSettingsRead &&
            permission !== Permission.organizationSettingsUpdate)) &&
        roleHasPermission(context.role, permission),
    );
  }

  private async loadActiveAccess(
    user:
      | {
          activeOrganization?: { id: string; role?: OrganizationRole };
          id: string;
        }
      | undefined,
  ): Promise<ActiveAccessContext | undefined> {
    // Deliberately ordered. Moving an inexpensive check earlier can leak whether
    // a resource exists outside the caller's active Organization context.
    if (!user?.id) throw PublicProblemException.permissionDenied();

    const activeOrganization = user.activeOrganization;
    if (!activeOrganization) {
      throw PublicProblemException.activeOrganizationRequired();
    }

    const membership = await this.repository.findMembership({
      organizationId: activeOrganization.id,
      userId: user.id,
    });
    if (!membership || membership.status !== 'active') return undefined;

    const organization = await this.repository.findOrganization(
      activeOrganization.id,
    );
    if (!organization || !activeOrganization.role) return undefined;

    return {
      activeOrganization,
      organization,
      role: activeOrganization.role,
    };
  }
}
