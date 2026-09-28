import {
  WebhookRepository,
  type WebhookDelivery,
  type WebhookEndpoint,
} from './webhook.js';
import { assertSafeWebhookUrl, signWebhook } from './webhooks.service.js';

export interface WebhookTransport {
  send(input: {
    endpoint: WebhookEndpoint;
    body: string;
    headers: Record<string, string>;
  }): Promise<{ status: number }>;
}

export class FetchWebhookTransport implements WebhookTransport {
  async send(input: {
    endpoint: WebhookEndpoint;
    body: string;
    headers: Record<string, string>;
  }) {
    await assertSafeWebhookUrl(input.endpoint.url);
    const response = await fetch(input.endpoint.url, {
      method: 'POST',
      body: input.body,
      headers: input.headers,
      redirect: 'error',
    });
    return { status: response.status };
  }
}

export class WebhookDeliveryProcessor {
  constructor(
    private readonly repository: WebhookRepository,
    private readonly transport: WebhookTransport = new FetchWebhookTransport(),
    private readonly maxAttempts = 5,
  ) {}
  async process(deliveryId: string, attemptNumber?: number) {
    const delivery = await this.repository.findDelivery(deliveryId);
    const endpoint =
      delivery && (await this.repository.findEndpoint(delivery.endpointId));
    if (!delivery || !endpoint || !endpoint.enabled) return;
    await assertSafeWebhookUrl(endpoint.url);
    const attempt = await this.repository.startAttempt(delivery.id);
    try {
      const signed = signWebhook(endpoint, delivery);
      const response = await this.transport.send({
        endpoint,
        body: signed.body,
        headers: {
          'content-type': 'application/json',
          'webhook-id': delivery.id,
          'webhook-timestamp': String(signed.timestamp),
          'webhook-signature': signed.signature,
        },
      });
      if (response.status < 200 || response.status >= 300)
        throw new Error(`Webhook returned HTTP ${response.status}`);
      await this.repository.finishAttempt({
        id: attempt.id,
        status: 'succeeded',
        responseStatus: response.status,
      });
      await this.repository.setDeliveryStatus(delivery.id, 'delivered');
    } catch (error) {
      await this.repository.finishAttempt({
        id: attempt.id,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      const number = attemptNumber ?? attempt.number;
      await this.repository.setDeliveryStatus(
        delivery.id,
        number >= this.maxAttempts ? 'dead-letter' : 'retrying',
      );
      throw error;
    }
  }
}
