import { randomUUID } from 'node:crypto';
import {
  NotificationProvider,
  NotificationQueue,
  NotificationRepository,
  type NotificationAttempt,
  type NotificationRecord,
  type NotificationStatus,
} from './notification.js';

export class MemoryNotificationRepository extends NotificationRepository {
  readonly records: NotificationRecord[] = [];
  readonly attempts: NotificationAttempt[] = [];
  async create(record: NotificationRecord) {
    if (this.records.some((item) => item.dedupeKey === record.dedupeKey))
      return null;
    this.records.push(record);
    return record;
  }
  async find(id: string) {
    return this.records.find((item) => item.id === id) ?? null;
  }
  async findForOrganization(id: string, organizationId: string) {
    const record = await this.find(id);
    return record?.organizationId === organizationId ? record : null;
  }
  async startAttempt(id: string) {
    const record = await this.find(id);
    if (!record) throw new Error('notification not found');
    record.attemptCount += 1;
    const attempt = {
      id: randomUUID(),
      notificationId: id,
      number: record.attemptCount,
      status: 'pending' as const,
      error: null,
      createdAt: new Date(),
    };
    this.attempts.push(attempt);
    return attempt;
  }
  async finishAttempt(input: {
    id: string;
    status: 'sent' | 'failed';
    error?: string;
  }) {
    const attempt = this.attempts.find((item) => item.id === input.id);
    if (attempt)
      Object.assign(attempt, {
        status: input.status,
        error: input.error ?? null,
      });
  }
  async setStatus(id: string, status: NotificationStatus, sentAt?: Date) {
    const record = await this.find(id);
    if (record)
      Object.assign(record, { status, sentAt: sentAt ?? record.sentAt });
  }
}
export class MemoryNotificationQueue extends NotificationQueue {
  readonly jobs: string[] = [];
  async enqueue(id: string) {
    if (!this.jobs.includes(id)) this.jobs.push(id);
  }
}
export class MemoryNotificationProvider extends NotificationProvider {
  readonly messages: { to: string; subject: string; body: string }[] = [];
  async send(message: { to: string; subject: string; body: string }) {
    this.messages.push(message);
  }
}
