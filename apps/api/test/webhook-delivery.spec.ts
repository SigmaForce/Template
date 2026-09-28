import { describe, expect, it } from 'vitest';
import { MemoryWebhookRepository } from '../src/webhooks/memory-webhooks.js';
import {
  WebhookDeliveryProcessor,
  type WebhookTransport,
} from '../src/webhooks/webhook-worker.js';

describe('WebhookDeliveryProcessor', () => {
  it('signs deliveries, records attempts, retries, and dead-letters', async () => {
    const repository = new MemoryWebhookRepository();
    await repository.createEndpoint({
      id: 'endpoint_1',
      organizationId: 'org_1',
      url: 'https://example.com/events',
      events: ['organization.file.created'],
      secret: 'secret',
      enabled: true,
      createdByUserId: 'user_1',
      createdAt: new Date(),
    });
    await repository.createDelivery({
      id: 'event_1',
      endpointId: 'endpoint_1',
      organizationId: 'org_1',
      eventType: 'organization.file.created',
      version: 'v1',
      payload: { fileId: 'file_1' },
      occurredAt: new Date('2026-09-25T00:00:00Z'),
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
      lastAttemptAt: null,
    });
    const requests: Array<{ headers: Record<string, string>; body: string }> =
      [];
    const transport: WebhookTransport = {
      send: async ({ headers, body }) => {
        requests.push({ headers, body });
        return { status: 202 };
      },
    };
    const processor = new WebhookDeliveryProcessor(repository, transport);
    await processor.process('event_1', 1);
    await processor.process('event_1', 2);
    expect(requests).toHaveLength(2);
    expect(requests[0].headers['webhook-id']).toBe('event_1');
    expect(requests[0].headers['webhook-signature']).toMatch(/^v1,/);
    expect(await repository.listAttempts('event_1')).toHaveLength(2);
    expect((await repository.findDelivery('event_1'))?.status).toBe(
      'delivered',
    );
    await repository.createDelivery({
      id: 'event_2',
      endpointId: 'endpoint_1',
      organizationId: 'org_1',
      eventType: 'organization.file.created',
      version: 'v1',
      payload: {},
      occurredAt: new Date(),
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
      lastAttemptAt: null,
    });
    const failing = new WebhookDeliveryProcessor(
      repository,
      {
        send: async () => {
          throw new Error('offline');
        },
      },
      2,
    );
    await expect(failing.process('event_2', 1)).rejects.toThrow('offline');
    await expect(failing.process('event_2', 2)).rejects.toThrow('offline');
    expect((await repository.findDelivery('event_2'))?.status).toBe(
      'dead-letter',
    );
  });
});
