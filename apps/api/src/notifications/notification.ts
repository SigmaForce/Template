export type NotificationKind =
  | 'security.api-key-issued'
  | 'billing.subscription-past-due'
  | 'integration.webhook-dead-letter';

export type NotificationIntent =
  | {
      kind: 'security.api-key-issued';
      organizationId: string;
      recipientEmail: string;
      apiKeyId: string;
    }
  | {
      kind: 'billing.subscription-past-due';
      organizationId: string;
      recipientEmail: string;
      planId: string;
    }
  | {
      kind: 'integration.webhook-dead-letter';
      organizationId: string;
      recipientEmail: string;
      deliveryId: string;
      endpointId: string;
    };

export type NotificationStatus =
  'pending' | 'sent' | 'retrying' | 'unavailable' | 'dead-letter';
export interface NotificationRecord {
  id: string;
  dedupeKey: string;
  organizationId: string;
  kind: NotificationKind;
  recipientEmail: string;
  payload: Record<string, string>;
  status: NotificationStatus;
  attemptCount: number;
  createdAt: Date;
  sentAt: Date | null;
}

export interface NotificationAttempt {
  id: string;
  notificationId: string;
  number: number;
  status: 'pending' | 'sent' | 'failed';
  error: string | null;
  createdAt: Date;
}

export abstract class NotificationRepository {
  abstract create(
    record: NotificationRecord,
  ): Promise<NotificationRecord | null>;
  abstract find(id: string): Promise<NotificationRecord | null>;
  abstract findForOrganization(
    id: string,
    organizationId: string,
  ): Promise<NotificationRecord | null>;
  abstract startAttempt(id: string): Promise<NotificationAttempt>;
  abstract finishAttempt(input: {
    id: string;
    status: 'sent' | 'failed';
    error?: string;
  }): Promise<void>;
  abstract setStatus(
    id: string,
    status: NotificationStatus,
    sentAt?: Date,
  ): Promise<void>;
}
export abstract class NotificationQueue {
  abstract enqueue(notificationId: string): Promise<void>;
}
export interface NotificationMessage {
  to: string;
  subject: string;
  body: string;
}
export abstract class NotificationProvider {
  abstract send(message: NotificationMessage): Promise<void>;
}
