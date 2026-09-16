import { Injectable } from '@nestjs/common';
import { PublicProblemException } from '../http/problem-details.js';
import {
  AuthorizationRepository,
  CapabilityPolicy,
  type AuthorizeOrganizationOperation,
  type AuthorizedOrganizationScope,
} from './authorization.js';
import { resolveOrganizationRole, roleHasPermission } from './permission.js';

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
      permission: operation.permission,
      role,
      userId: user.id,
    };
  }
}
