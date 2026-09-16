import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import type { CreateOrganizationDto } from './create-organization.dto.js';
import { PublicProblemException } from '../http/problem-details.js';
import {
  OrganizationDirectory,
  OrganizationRepository,
  type OrganizationOnboardingResult,
  OrganizationSlugConflictError,
} from './organization.js';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly directory: OrganizationDirectory,
  ) {}

  async createFirstOrganization(
    user: AuthenticatedUser,
    idempotencyKey: string,
    input: CreateOrganizationDto,
  ): Promise<OrganizationOnboardingResult> {
    const requestHash = createHash('sha256')
      .update(
        [input.name, input.slug, input.locale, input.timeZone].join('\u0000'),
      )
      .digest('hex');
    const claim = await this.repository.claimOnboarding({
      idempotencyKey,
      requestHash,
      userId: user.id,
    });

    if (claim.status === 'replay') return claim.result;
    if (claim.status === 'conflict') {
      throw PublicProblemException.idempotencyConflict();
    }
    if (claim.status === 'in-progress') {
      throw PublicProblemException.organizationOnboardingInProgress();
    }
    if (claim.status === 'already-complete') {
      throw PublicProblemException.organizationAlreadyExists();
    }

    let directoryOrganization: { id: string };
    try {
      directoryOrganization = await this.directory.create({
        name: input.name,
        slug: input.slug,
        userId: user.id,
      });
    } catch (error) {
      await this.repository.releaseOnboarding({
        idempotencyKey,
        userId: user.id,
      });
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }
    const result = {
      organization: { id: directoryOrganization.id, ...input },
      membership: { role: 'owner' as const },
    };

    try {
      await this.repository.completeOnboarding({
        idempotencyKey,
        organization: result.organization,
        requestHash,
        userId: user.id,
      });
    } catch (error) {
      await Promise.allSettled([
        this.directory.delete(directoryOrganization.id),
        this.repository.releaseOnboarding({
          idempotencyKey,
          userId: user.id,
        }),
      ]);
      if (error instanceof OrganizationSlugConflictError) {
        throw PublicProblemException.organizationSlugConflict();
      }
      throw error;
    }

    return result;
  }

  async getOnboarding(user: AuthenticatedUser) {
    const result = await this.repository.findOnboarding(user.id);
    return result
      ? { status: 'complete' as const, ...result }
      : { status: 'required' as const };
  }
}
