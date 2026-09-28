import { describe, expect, it } from 'vitest';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import {
  MemoryNotificationProvider,
  MemoryNotificationQueue,
  MemoryNotificationRepository,
} from '../src/notifications/memory-notifications.js';
import { NotificationProcessor } from '../src/notifications/notification-worker.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';

describe('operational notifications', () => {
  it('stores typed safe intent data and deduplicates it', async () => {
    const repository = new MemoryNotificationRepository();
    const queue = new MemoryNotificationQueue();
    const service = new NotificationsService(repository, queue);
    const intent = {
      kind: 'security.api-key-issued' as const,
      organizationId: 'org_1',
      recipientEmail: 'owner@example.test',
      apiKeyId: 'key_1',
    };
    const first = await service.enqueue(intent);
    const duplicate = await service.enqueue(intent);
    expect(first?.payload).toEqual({ apiKeyId: 'key_1' });
    expect(duplicate).toBeNull();
    expect(queue.jobs).toEqual([first!.id]);
    expect(await repository.findForOrganization(first!.id, 'org_2')).toBeNull();
  });
  it('degrades without a provider and redacts secrets from provider errors', async () => {
    const repository = new MemoryNotificationRepository();
    const queue = new MemoryNotificationQueue();
    const service = new NotificationsService(repository, queue);
    const audit = new MemoryAuditEventRepository();
    const record = await service.enqueue({
      kind: 'integration.webhook-dead-letter',
      organizationId: 'org_1',
      recipientEmail: 'owner@example.test',
      deliveryId: 'delivery_1',
      endpointId: 'endpoint_1',
    });
    await new NotificationProcessor(repository, audit).process(record!.id);
    expect((await repository.find(record!.id))?.status).toBe('unavailable');
    const failing = {
      send: async () => {
        throw new Error('secret whsec_top-secret sak_hidden');
      },
    };
    await expect(
      new NotificationProcessor(repository, audit, failing).process(record!.id),
    ).resolves.toBeUndefined();
    const second = await service.enqueue({
      kind: 'billing.subscription-past-due',
      organizationId: 'org_1',
      recipientEmail: 'owner@example.test',
      planId: 'launch',
    });
    await expect(
      new NotificationProcessor(repository, audit, failing, 1).process(
        second!.id,
      ),
    ).rejects.toThrow('REDACTED');
    expect((await repository.find(second!.id))?.status).toBe('dead-letter');
  });
});
