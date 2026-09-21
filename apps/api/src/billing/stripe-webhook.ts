import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BillingInboxEvent, SubscriptionStatus } from './billing.js';

const subscriptionStatuses = new Set<SubscriptionStatus>([
  'active',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'past_due',
  'paused',
  'trialing',
  'unpaid',
]);

export class InvalidStripeWebhookError extends Error {}

export class StripeWebhookVerifier {
  constructor(
    private readonly secret: string,
    private readonly now = Date.now,
  ) {}

  verify(rawBody: Buffer | undefined, signatureHeader: string | undefined) {
    if (!rawBody || !signatureHeader) throw new InvalidStripeWebhookError();
    const entries = signatureHeader.split(',').map((entry) => entry.split('='));
    const timestamp = Number(entries.find(([key]) => key === 't')?.[1]);
    const signatures = entries
      .filter(([key]) => key === 'v1')
      .map(([, signature]) => signature);
    if (
      !Number.isSafeInteger(timestamp) ||
      Math.abs(Math.floor(this.now() / 1_000) - timestamp) > 300
    ) {
      throw new InvalidStripeWebhookError();
    }

    const expected = createHmac('sha256', this.secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest();
    const valid = signatures.some((signature) => {
      if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
      return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
    });
    if (!valid) throw new InvalidStripeWebhookError();

    return this.parse(rawBody);
  }

  private parse(rawBody: Buffer): BillingInboxEvent {
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new InvalidStripeWebhookError();
    }
    if (
      !isRecord(payload) ||
      (payload.type !== 'customer.subscription.created' &&
        payload.type !== 'customer.subscription.updated')
    ) {
      throw new InvalidStripeWebhookError();
    }
    const data = payload.data;
    const subscription = isRecord(data) ? data.object : undefined;
    const metadata = isRecord(subscription) ? subscription.metadata : undefined;
    const items = isRecord(subscription) ? subscription.items : undefined;
    const itemList = isRecord(items) ? items.data : undefined;
    const firstItem = Array.isArray(itemList) ? itemList[0] : undefined;
    const price = isRecord(firstItem) ? firstItem.price : undefined;
    const status = isRecord(subscription) ? subscription.status : undefined;
    if (
      typeof payload.id !== 'string' ||
      !/^evt_[A-Za-z0-9_]+$/.test(payload.id) ||
      typeof payload.created !== 'number' ||
      !Number.isSafeInteger(payload.created) ||
      !isRecord(subscription) ||
      typeof subscription.id !== 'string' ||
      !/^sub_[A-Za-z0-9_]+$/.test(subscription.id) ||
      typeof subscription.current_period_end !== 'number' ||
      !Number.isSafeInteger(subscription.current_period_end) ||
      !isRecord(metadata) ||
      typeof metadata.organizationId !== 'string' ||
      !/^org_[A-Za-z0-9_]+$/.test(metadata.organizationId) ||
      !isRecord(price) ||
      typeof price.id !== 'string' ||
      !/^price_[A-Za-z0-9]+$/.test(price.id) ||
      typeof status !== 'string' ||
      !subscriptionStatuses.has(status as SubscriptionStatus)
    ) {
      throw new InvalidStripeWebhookError();
    }

    return {
      createdAt: new Date(payload.created * 1_000),
      currentPeriodEndsAt: new Date(subscription.current_period_end * 1_000),
      id: payload.id,
      organizationId: metadata.organizationId,
      payload,
      priceId: price.id,
      providerSubscriptionId: subscription.id,
      status: status as SubscriptionStatus,
      type: payload.type,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
