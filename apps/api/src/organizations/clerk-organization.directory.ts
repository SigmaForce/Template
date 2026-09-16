import { createClerkClient } from '@clerk/backend';
import { isClerkAPIResponseError } from '@clerk/backend/errors';
import {
  OrganizationDirectory,
  OrganizationSlugConflictError,
} from './organization.js';

export class ClerkOrganizationDirectory extends OrganizationDirectory {
  private readonly client;

  constructor(secretKey: string) {
    super();
    this.client = createClerkClient({ secretKey });
  }

  async create(input: { name: string; slug: string; userId: string }) {
    let organization: { id: string };
    try {
      organization = await this.client.organizations.createOrganization({
        name: input.name,
        slug: input.slug,
        createdBy: input.userId,
      });
    } catch (error) {
      if (this.isSlugConflict(error)) {
        throw new OrganizationSlugConflictError();
      }
      throw error;
    }

    try {
      await this.client.organizations.updateOrganizationMembership({
        organizationId: organization.id,
        userId: input.userId,
        role: 'org:owner',
      });
    } catch (error) {
      await this.client.organizations.deleteOrganization(organization.id);
      throw error;
    }

    return organization;
  }

  async delete(organizationId: string) {
    await this.client.organizations.deleteOrganization(organizationId);
  }

  private isSlugConflict(error: unknown) {
    return (
      isClerkAPIResponseError(error) &&
      error.errors.some(
        (item) =>
          item.code.toLowerCase().includes('slug') ||
          item.meta?.paramName === 'slug' ||
          item.meta?.name === 'slug',
      )
    );
  }
}
