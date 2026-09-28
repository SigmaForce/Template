import { randomUUID } from 'node:crypto';
import {
  WebhookRepository,
  type WebhookDelivery,
  type WebhookDeliveryAttempt,
  type WebhookEndpoint,
  type WebhookDeliveryStatus,
} from './webhook.js';

export class MemoryWebhookRepository extends WebhookRepository {
  readonly endpoints: WebhookEndpoint[] = [];
  readonly deliveries: WebhookDelivery[] = [];
  readonly attempts: WebhookDeliveryAttempt[] = [];

  async createEndpoint(endpoint: WebhookEndpoint) {
    this.endpoints.push(endpoint);
    return endpoint;
  }
  async listEndpoints(organizationId: string) {
    return this.endpoints.filter(
      (item) => item.organizationId === organizationId,
    );
  }
  async findEndpoint(id: string) {
    return this.endpoints.find((item) => item.id === id) ?? null;
  }
  async updateEndpoint(
    input: Pick<WebhookEndpoint, 'id' | 'organizationId' | 'enabled'>,
  ) {
    const item = this.endpoints.find(
      (value) =>
        value.id === input.id && value.organizationId === input.organizationId,
    );
    if (!item) return false;
    item.enabled = input.enabled;
    return true;
  }
  async createDelivery(delivery: WebhookDelivery) {
    if (
      this.deliveries.some(
        (item) =>
          item.endpointId === delivery.endpointId && item.id === delivery.id,
      )
    )
      return null;
    this.deliveries.push(delivery);
    return delivery;
  }
  async findDelivery(id: string) {
    return this.deliveries.find((item) => item.id === id) ?? null;
  }
  async startAttempt(deliveryId: string) {
    const delivery = await this.findDelivery(deliveryId);
    if (!delivery) throw new Error('delivery not found');
    delivery.attemptCount += 1;
    delivery.lastAttemptAt = new Date();
    const attempt = {
      id: randomUUID(),
      deliveryId,
      number: delivery.attemptCount,
      status: 'pending' as const,
      responseStatus: null,
      error: null,
      createdAt: new Date(),
    };
    this.attempts.push(attempt);
    return attempt;
  }
  async finishAttempt(input: {
    id: string;
    status: 'succeeded' | 'failed';
    responseStatus?: number;
    error?: string;
  }) {
    const attempt = this.attempts.find((item) => item.id === input.id);
    if (attempt)
      Object.assign(attempt, input, {
        responseStatus: input.responseStatus ?? null,
        error: input.error ?? null,
      });
  }
  async setDeliveryStatus(id: string, status: WebhookDeliveryStatus) {
    const item = await this.findDelivery(id);
    if (item) item.status = status;
  }
  async listAttempts(deliveryId: string) {
    return this.attempts.filter((item) => item.deliveryId === deliveryId);
  }
}

export class MemoryWebhookQueue {
  readonly jobs: string[] = [];
  async enqueue(deliveryId: string) {
    if (!this.jobs.includes(deliveryId)) this.jobs.push(deliveryId);
  }
}
