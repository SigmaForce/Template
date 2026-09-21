export interface CreateCheckoutSession {
  cancelUrl: string;
  organizationId: string;
  priceId: string;
  successUrl: string;
}

export abstract class BillingCheckoutGateway {
  abstract createSession(input: CreateCheckoutSession): Promise<string>;
}

export class MemoryBillingCheckoutGateway extends BillingCheckoutGateway {
  readonly sessions: CreateCheckoutSession[] = [];

  async createSession(input: CreateCheckoutSession) {
    this.sessions.push(input);
    return 'https://checkout.stripe.com/c/pay/cs_test_checkout';
  }
}

export class StripeCheckoutGateway extends BillingCheckoutGateway {
  constructor(
    private readonly secretKey: string,
    private readonly request: typeof fetch = fetch,
  ) {
    super();
  }

  async createSession(input: CreateCheckoutSession) {
    const body = new URLSearchParams({
      cancel_url: input.cancelUrl,
      client_reference_id: input.organizationId,
      'line_items[0][price]': input.priceId,
      'line_items[0][quantity]': '1',
      'metadata[organizationId]': input.organizationId,
      mode: 'subscription',
      'subscription_data[metadata][organizationId]': input.organizationId,
      success_url: input.successUrl,
    });
    const response = await this.request(
      'https://api.stripe.com/v1/checkout/sessions',
      {
        body,
        headers: {
          authorization: `Bearer ${this.secretKey}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    );
    if (!response.ok)
      throw new Error('Stripe Checkout session creation failed.');

    const payload: unknown = await response.json();
    const checkoutUrl =
      typeof payload === 'object' && payload !== null && 'url' in payload
        ? payload.url
        : undefined;
    if (
      typeof checkoutUrl !== 'string' ||
      new URL(checkoutUrl).origin !== 'https://checkout.stripe.com'
    ) {
      throw new Error('Stripe Checkout returned an invalid URL.');
    }
    return checkoutUrl;
  }
}
