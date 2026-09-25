import type { AuditEventRepository } from '../audit-events/audit-event.js';
import type { OrganizationProfile } from '../organizations/organization.js';

export interface CompleteFirstOrganizationRecord {
  auditEvent: {
    action: 'organization.created';
    actor: { id: string; type: 'user' };
    context: Record<string, never>;
    id: string;
    occurredAt: Date;
    organizationId: string;
    target: { id: string; type: 'organization' };
  };
  idempotencyKey: string;
  organization: OrganizationProfile;
  requestHash: string;
  userId: string;
}

export abstract class OrganizationOnboardingUnitOfWork {
  abstract complete(record: CompleteFirstOrganizationRecord): Promise<void>;
}

export class MemoryOrganizationOnboardingUnitOfWork extends OrganizationOnboardingUnitOfWork {
  constructor(
    private readonly validateOrganization: (
      record: CompleteFirstOrganizationRecord,
    ) => Promise<void>,
    private readonly completeOrganization: (
      record: CompleteFirstOrganizationRecord,
    ) => Promise<void>,
    private readonly auditEvents: AuditEventRepository,
  ) {
    super();
  }

  async complete(record: CompleteFirstOrganizationRecord) {
    await this.validateOrganization(record);
    await this.auditEvents.append(record.auditEvent);
    await this.completeOrganization(record);
  }
}
