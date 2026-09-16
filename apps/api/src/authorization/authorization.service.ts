import { Injectable } from '@nestjs/common';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AuthorizationRepository,
  Capability,
  CapabilityPolicy,
  type AuthorizeOrganizationOperation,
  type AuthorizedOrganizationScope,
} from './authorization.js';
import {
  Permission,
  permissionsForRole,
  resolveOrganizationRole,
  roleHasPermission,
  type PermissionId,
} from './permission.js';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly capabilities: CapabilityPolicy,
  ) {}

  async authorize(
    operation: AuthorizeOrganizationOperation,
  ): Promise<AuthorizedOrganizationScope> {
    // Deliberately ordered. Moving an inexpensive check earlier can leak whether
    // a resource exists outside the caller's active Organization context.
    const user = operation.user;
    if (!user?.id) throw PublicProblemException.permissionDenied();

    const activeOrganization = user.activeOrganization;
    if (!activeOrganization) {
      throw PublicProblemException.activeOrganizationRequired();
    }

    const membership = await this.repository.findMembership({
      organizationId: activeOrganization.id,
      userId: user.id,
    });
    if (!membership || membership.status !== 'active') {
      throw PublicProblemException.permissionDenied();
    }

    const organization = await this.repository.findOrganization(
      activeOrganization.id,
    );
    if (
      !organization ||
      organization.state === 'pending-deletion' ||
      (operation.mode === 'write' && organization.state !== 'active')
    ) {
      throw PublicProblemException.permissionDenied();
    }

    if (
      !(await this.capabilities.isEnabled({
        capability: operation.capability,
        organizationId: activeOrganization.id,
      }))
    ) {
      throw PublicProblemException.permissionDenied();
    }

    const role = resolveOrganizationRole(activeOrganization.role);
    if (!role || !roleHasPermission(role, operation.permission)) {
      throw PublicProblemException.permissionDenied();
    }

    if (operation.targetOrganizationId !== activeOrganization.id) {
      throw PublicProblemException.permissionDenied();
    }

    return {
      organizationId: activeOrganization.id,
    };
  }

  async permissionsForActiveOrganization(user: {
    activeOrganization?: { id: string; role?: string };
    id: string;
  }): Promise<PermissionId[]> {
    const activeOrganization = user.activeOrganization;
    if (!activeOrganization) {
      throw PublicProblemException.activeOrganizationRequired();
    }

    const membership = await this.repository.findMembership({
      organizationId: activeOrganization.id,
      userId: user.id,
    });
    if (!membership || membership.status !== 'active') return [];

    const organization = await this.repository.findOrganization(
      activeOrganization.id,
    );
    if (!organization || organization.state !== 'active') return [];

    const settingsEnabled = await this.capabilities.isEnabled({
      capability: Capability.organizationSettings,
      organizationId: activeOrganization.id,
    });
    const role = resolveOrganizationRole(activeOrganization.role);
    if (!role) return [];

    return permissionsForRole(role).filter(
      (permission) =>
        settingsEnabled ||
        (permission !== Permission.organizationSettingsRead &&
          permission !== Permission.organizationSettingsUpdate),
    );
  }
}
