export type WebhookDeliveryStatus =
  'pending' | 'delivered' | 'retrying' | 'dead-letter';

export interface WebhookEndpoint {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdByUserId: string;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  organizationId: string;
  eventType: string;
  version: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  createdAt: Date;
  lastAttemptAt: Date | null;
}

export interface WebhookDeliveryAttempt {
  id: string;
  deliveryId: string;
  number: number;
  status: 'pending' | 'succeeded' | 'failed';
  responseStatus: number | null;
  error: string | null;
  createdAt: Date;
}

export abstract class WebhookRepository {
  abstract createEndpoint(endpoint: WebhookEndpoint): Promise<WebhookEndpoint>;
  abstract listEndpoints(organizationId: string): Promise<WebhookEndpoint[]>;
  abstract findEndpoint(id: string): Promise<WebhookEndpoint | null>;
  abstract updateEndpoint(
    input: Pick<WebhookEndpoint, 'id' | 'organizationId' | 'enabled'>,
  ): Promise<boolean>;
  abstract createDelivery(
    delivery: WebhookDelivery,
  ): Promise<WebhookDelivery | null>;
  abstract findDelivery(id: string): Promise<WebhookDelivery | null>;
  abstract startAttempt(deliveryId: string): Promise<WebhookDeliveryAttempt>;
  abstract finishAttempt(input: {
    id: string;
    status: 'succeeded' | 'failed';
    responseStatus?: number;
    error?: string;
  }): Promise<void>;
  abstract setDeliveryStatus(
    id: string,
    status: WebhookDeliveryStatus,
  ): Promise<void>;
  abstract listAttempts(deliveryId: string): Promise<WebhookDeliveryAttempt[]>;
}

export abstract class WebhookDeliveryQueue {
  abstract enqueue(deliveryId: string): Promise<void>;
}
