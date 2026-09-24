import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Capability } from '../authorization/authorization.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { BillingRepository } from '../billing/billing.js';
import { findPlan } from '../billing/plan-catalog.js';
import {
  LastOwnerRequiredError,
  MembershipStateConflictError,
  OrganizationDirectory,
  OrganizationRepository,
  SeatAllowanceExceededError,
} from './organization.js';
import type { ListMembershipsQuery } from './list-memberships.query.js';
import { UpdateMembershipDto } from './update-membership.dto.js';

const cursorScope = 'organization-memberships';
const cursorSort = 'userId';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly directory: OrganizationDirectory,
    private readonly authorization: AuthorizationService,
    private readonly billing: BillingRepository,
  ) {}

  async list(
    user: AuthenticatedUser,
    organizationId: string,
    query: ListMembershipsQuery,
  ) {
    const scope = await this.authorizeManagement(user, organizationId);
    const afterUserId = query.cursor
      ? this.decodeCursor(query.cursor, scope.organizationId)
      : undefined;
    const memberships = await this.repository.listMemberships({
      afterUserId,
      limit: query.limit + 1,
      organizationId: scope.organizationId,
    });
    const hasNextPage = memberships.length > query.limit;
    const items = memberships.slice(0, query.limit);
    const lastItem = items.at(-1);
    return {
      items: items.map((membership) => this.publicMembership(membership)),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && lastItem
            ? this.encodeCursor(lastItem.userId, scope.organizationId)
            : null,
      },
    };
  }

  async update(
    user: AuthenticatedUser,
    organizationId: string,
    targetUserId: string,
    input: UpdateMembershipDto,
  ) {
    if ((input.role === undefined) === (input.status === undefined)) {
      throw PublicProblemException.validation([
        {
          pointer: UpdateMembershipDto.validationRoot,
          detail: 'Provide exactly one Membership role or status change.',
        },
      ]);
    }
    const scope = await this.authorizeManagement(user, organizationId);
    const membership = await this.repository.findMembershipRecord({
      organizationId: scope.organizationId,
      userId: targetUserId,
    });
    if (!membership || membership.status === 'removed') {
      throw PublicProblemException.membershipUnavailable();
    }
    if (
      scope.role === 'admin' &&
      (membership.role === 'owner' || input.role === 'owner')
    ) {
      throw PublicProblemException.permissionDenied();
    }

    let updated;
    try {
      const subscription =
        input.status === 'active'
          ? await this.billing.findSubscription(scope.organizationId)
          : undefined;
      updated = await this.repository.updateMembership({
        expectedRole: membership.role,
        organizationId: scope.organizationId,
        role: input.role,
        seatAllowance: subscription
          ? findPlan(subscription.planId, subscription.planVersion)
              ?.seatAllowance
          : undefined,
        status: input.status,
        userId: targetUserId,
      });
    } catch (error) {
      this.rethrowStateConflict(error);
    }
    if (input.role) {
      try {
        await this.directory.updateMembershipRole({
          organizationId: scope.organizationId,
          role: input.role,
          userId: targetUserId,
        });
      } catch (error) {
        await this.repository.updateMembership({
          expectedRole: input.role,
          organizationId: scope.organizationId,
          role: membership.role,
          status: membership.status,
          userId: targetUserId,
        });
        throw error;
      }
    }
    return this.publicMembership(updated);
  }

  async remove(
    user: AuthenticatedUser,
    organizationId: string,
    targetUserId: string,
  ) {
    const scope = await this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationMemberships,
      permission:
        targetUserId === user.id
          ? Permission.organizationMembershipsLeave
          : Permission.organizationMembershipsManage,
    });
    const membership = await this.repository.findMembershipRecord({
      organizationId: scope.organizationId,
      userId: targetUserId,
    });
    if (!membership || membership.status === 'removed') {
      throw PublicProblemException.membershipUnavailable();
    }
    if (scope.role === 'admin' && membership.role === 'owner') {
      throw PublicProblemException.permissionDenied();
    }

    let removed;
    try {
      removed = await this.repository.updateMembership({
        expectedRole: membership.role,
        organizationId: scope.organizationId,
        status: 'removed',
        userId: targetUserId,
      });
    } catch (error) {
      this.rethrowStateConflict(error);
    }

    try {
      await this.directory.deleteMembership({
        organizationId: scope.organizationId,
        userId: targetUserId,
      });
    } catch (error) {
      await this.repository.updateMembership({
        organizationId: scope.organizationId,
        role: membership.role,
        status: membership.status,
        userId: targetUserId,
      });
      throw error;
    }
    return this.publicMembership(removed);
  }

  private authorizeManagement(user: AuthenticatedUser, organizationId: string) {
    return this.authorization.authorize({
      user,
      targetOrganizationId: organizationId,
      capability: Capability.organizationMemberships,
      permission: Permission.organizationMembershipsManage,
    });
  }

  private publicMembership(membership: {
    organizationId: string;
    role: 'admin' | 'member' | 'owner';
    status: 'active' | 'removed' | 'suspended';
    userId: string;
  }) {
    const { organizationId: _organizationId, ...result } = membership;
    return result;
  }

  private encodeCursor(userId: string, organizationId: string) {
    return Buffer.from(
      JSON.stringify({
        organizationId,
        scope: cursorScope,
        sort: cursorSort,
        userId,
        version: 1,
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string, organizationId: string) {
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('version' in payload) ||
        payload.version !== 1 ||
        !('scope' in payload) ||
        payload.scope !== cursorScope ||
        !('sort' in payload) ||
        payload.sort !== cursorSort ||
        !('organizationId' in payload) ||
        payload.organizationId !== organizationId ||
        !('userId' in payload) ||
        typeof payload.userId !== 'string'
      ) {
        throw new Error('Invalid Membership cursor.');
      }
      return payload.userId;
    } catch {
      throw PublicProblemException.validation([
        {
          pointer: '#/query/cursor',
          detail: 'cursor is invalid for the requested Membership collection',
        },
      ]);
    }
  }

  private rethrowStateConflict(error: unknown): never {
    if (error instanceof LastOwnerRequiredError) {
      throw PublicProblemException.lastOwnerRequired();
    }
    if (error instanceof MembershipStateConflictError) {
      throw PublicProblemException.membershipUnavailable();
    }
    if (error instanceof SeatAllowanceExceededError) {
      throw PublicProblemException.seatAllowanceExceeded();
    }
    throw error;
  }
}
