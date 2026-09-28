import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  NotificationQueue,
  NotificationRepository,
  type NotificationIntent,
  type NotificationRecord,
} from './notification.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly queue: NotificationQueue,
  ) {}
  async enqueue(intent: NotificationIntent) {
    const record: NotificationRecord = {
      id: randomUUID(),
      dedupeKey: this.dedupeKey(intent),
      organizationId: intent.organizationId,
      kind: intent.kind,
      recipientEmail: intent.recipientEmail,
      payload: this.safePayload(intent),
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
      sentAt: null,
    };
    const created = await this.repository.create(record);
    if (created) await this.queue.enqueue(created.id);
    return created;
  }
  private dedupeKey(intent: NotificationIntent) {
    return `${intent.organizationId}:${intent.kind}:${intent.kind === 'security.api-key-issued' ? intent.apiKeyId : intent.kind === 'billing.subscription-past-due' ? intent.planId : intent.deliveryId}`;
  }
  private safePayload(intent: NotificationIntent): Record<string, string> {
    switch (intent.kind) {
      case 'security.api-key-issued':
        return { apiKeyId: intent.apiKeyId };
      case 'billing.subscription-past-due':
        return { planId: intent.planId };
      case 'integration.webhook-dead-letter':
        return { deliveryId: intent.deliveryId, endpointId: intent.endpointId };
    }
  }
}
