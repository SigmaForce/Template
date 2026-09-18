import { Injectable } from '@nestjs/common';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AuthorizationRepository,
  Capability,
  CapabilityPolicy,
  type AuthorizeOrganizationOperation,
  type AuthorizedOrganizationScope,
  type CapabilityId,
  type OrganizationAccess,
} from './authorization.js';
import {
  Permission,
  organizationStateAllows,
  roleHasPermission,
  type OrganizationRole,
  type PermissionId,
} from './permission.js';

interface OrganizationAccessContext {
  organizationId: string;
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
    if (!context) {
      throw PublicProblemException.permissionDenied();
    }

    if (
      !(await this.isPermissionAllowed(
        context,
        operation.permission,
        operation.capability,
      ))
    ) {
      throw PublicProblemException.permissionDenied();
    }

    if (operation.targetOrganizationId !== context.organizationId) {
      throw PublicProblemException.permissionDenied();
    }

    return {
      organizationId: context.organizationId,
      role: context.role,
    };
  }

  async authorizeMembership(operation: {
    capability: CapabilityId;
    permission: PermissionId;
    targetOrganizationId: string;
    user: { id: string } | undefined;
  }): Promise<AuthorizedOrganizationScope> {
    if (!operation.user?.id) throw PublicProblemException.permissionDenied();

    const context = await this.loadOrganizationAccess(
      operation.user,
      operation.targetOrganizationId,
    );
    if (
      !context ||
      !(await this.isPermissionAllowed(
        context,
        operation.permission,
        operation.capability,
      ))
    ) {
      throw PublicProblemException.permissionDenied();
    }

    return {
      organizationId: operation.targetOrganizationId,
      role: context.role,
    };
  }

  async permissionsForActiveOrganization(user: {
    activeOrganization?: { id: string; role?: OrganizationRole };
    id: string;
  }): Promise<PermissionId[]> {
    const context = await this.loadActiveAccess(user);
    if (!context) return [];

    const decisions = await Promise.all(
      Object.values(Permission).map(async (permission) => ({
        allowed: await this.isPermissionAllowed(
          context,
          permission,
          this.capabilityForPermission(permission),
        ),
        permission,
      })),
    );

    return decisions
      .filter((decision) => decision.allowed)
      .map((decision) => decision.permission);
  }

  private async isPermissionAllowed(
    context: OrganizationAccessContext,
    permission: PermissionId,
    capability: CapabilityId | undefined,
  ) {
    if (!organizationStateAllows(context.organization.state, permission)) {
      return false;
    }
    if (
      capability &&
      !(await this.capabilities.isEnabled({
        capability,
        organizationId: context.organizationId,
      }))
    ) {
      return false;
    }
    return roleHasPermission(context.role, permission);
  }

  private capabilityForPermission(permission: PermissionId) {
    if (
      permission === Permission.organizationMembershipsManage ||
      permission === Permission.organizationMembershipsLeave
    ) {
      return Capability.organizationMemberships;
    }
    return permission === Permission.organizationSettingsRead ||
      permission === Permission.organizationSettingsUpdate
      ? Capability.organizationSettings
      : undefined;
  }

  private async loadActiveAccess(
    user:
      | {
          activeOrganization?: { id: string; role?: OrganizationRole };
          id: string;
        }
      | undefined,
  ): Promise<OrganizationAccessContext | undefined> {
    // Deliberately ordered. Moving an inexpensive check earlier can leak whether
    // a resource exists outside the caller's active Organization context.
    if (!user?.id) throw PublicProblemException.permissionDenied();

    const activeOrganization = user.activeOrganization;
    if (!activeOrganization) {
      throw PublicProblemException.activeOrganizationRequired();
    }

    const context = await this.loadOrganizationAccess(
      user,
      activeOrganization.id,
      activeOrganization.role,
    );
    if (context?.role !== activeOrganization.role) return undefined;

    return context;
  }

  private async loadOrganizationAccess(
    user: { id: string },
    organizationId: string,
    assertedRole?: OrganizationRole,
  ): Promise<OrganizationAccessContext | undefined> {
    const membership = await this.repository.findMembership({
      organizationId,
      userId: user.id,
    });
    if (
      !membership ||
      membership.status !== 'active' ||
      (assertedRole && membership.role && membership.role !== assertedRole)
    ) {
      return undefined;
    }
    const role = membership.role ?? assertedRole;
    if (!role) return undefined;
    const organization = await this.repository.findOrganization(organizationId);
    if (!organization) return undefined;
    return {
      organizationId,
      organization,
      role,
    };
  }
}
