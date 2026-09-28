import { randomUUID } from 'node:crypto';
import {
  NotificationProvider,
  NotificationRepository,
  type NotificationIntent,
  type NotificationRecord,
} from './notification.js';
import { AuditEventRepository } from '../audit-events/audit-event.js';

export class NotificationProcessor {
  constructor(
    private readonly repository: NotificationRepository,
    private readonly audit: AuditEventRepository,
    private readonly provider?: NotificationProvider,
    private readonly maxAttempts = 5,
  ) {}
  async process(id: string, attemptNumber = 1) {
    const record = await this.repository.find(id);
    if (!record || record.status === 'sent' || record.status === 'unavailable')
      return;
    const attempt = await this.repository.startAttempt(id);
    if (!this.provider) {
      await this.repository.finishAttempt({
        id: attempt.id,
        status: 'failed',
        error: 'notification provider unavailable',
      });
      await this.repository.setStatus(id, 'unavailable');
      return;
    }
    try {
      await this.provider.send(this.message(record));
      await this.repository.finishAttempt({ id: attempt.id, status: 'sent' });
      await this.repository.setStatus(id, 'sent', new Date());
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message.replace(
              /(sk_|sak_|whsec_|Bearer\s+)[^\s]+/gi,
              '[REDACTED]',
            )
          : 'notification provider failed';
      await this.repository.finishAttempt({
        id: attempt.id,
        status: 'failed',
        error: message,
      });
      await this.repository.setStatus(
        id,
        attemptNumber >= this.maxAttempts ? 'dead-letter' : 'retrying',
      );
      throw new Error(message);
    }
    try {
      await this.audit.append({
        id: randomUUID(),
        action: 'organization.notification.sent',
        actor: { id: 'system', type: 'operator' },
        context: { kind: record.kind },
        occurredAt: new Date(),
        organizationId: record.organizationId,
        target: { id: record.id, type: 'notification' },
      });
    } catch {
      // A completed provider send must not be retried because audit persistence failed.
    }
  }
  private message(record: NotificationRecord) {
    const subject =
      record.kind === 'security.api-key-issued'
        ? 'A new API Key was issued'
        : record.kind === 'billing.subscription-past-due'
          ? 'Subscription payment needs attention'
          : 'Webhook delivery failed';
    return {
      to: record.recipientEmail,
      subject,
      body: JSON.stringify({ kind: record.kind, ...record.payload }),
    };
  }
}
