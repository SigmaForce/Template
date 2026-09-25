import { describe, expect, it } from 'vitest';
import { MemoryOrganizationRepository } from '../src/organizations/memory-organizations.js';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import {
  MemoryOrganizationOnboardingUnitOfWork,
  type CompleteFirstOrganizationRecord,
} from '../src/application/organization-onboarding.js';

describe('Memory Organization onboarding unit of work', () => {
  it('records only the onboarding that reserves a contested slug', async () => {
    const organizations = new MemoryOrganizationRepository();
    const auditEvents = new MemoryAuditEventRepository();
    const onboarding = new MemoryOrganizationOnboardingUnitOfWork(
      (record) => organizations.reserveOnboarding(record),
      (record) => organizations.completeOnboarding(record),
      (record) => organizations.releaseOnboardingReservation(record),
      auditEvents,
    );
    const record = (id: string): CompleteFirstOrganizationRecord => ({
      auditEvent: {
        action: 'organization.created',
        actor: { id: `user_${id}`, type: 'user' },
        context: {},
        id: `event_${id}`,
        occurredAt: new Date(),
        organizationId: id,
        target: { id, type: 'organization' },
      },
      idempotencyKey: `request_${id}`,
      organization: {
        billingContactEmail: null,
        id,
        locale: 'en-US',
        name: id,
        slug: 'contested-slug',
        timeZone: 'UTC',
      },
      requestHash: `hash_${id}`,
      userId: `user_${id}`,
    });

    const results = await Promise.allSettled([
      onboarding.complete(record('org_first')),
      onboarding.complete(record('org_second')),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const events = await Promise.all(
      ['org_first', 'org_second'].map((organizationId) =>
        auditEvents.list({ limit: 10, organizationId }),
      ),
    );
    expect(events.flat()).toHaveLength(1);
  });
});
