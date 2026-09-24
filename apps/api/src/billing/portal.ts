export interface CreatePortalSession {
  customerId: string;
  idempotencyKey: string;
  returnUrl: string;
}

export abstract class BillingPortalGateway {
  abstract createSession(input: CreatePortalSession): Promise<string>;
}

export class MemoryBillingPortalGateway extends BillingPortalGateway {
  readonly sessions: CreatePortalSession[] = [];

  async createSession(input: CreatePortalSession) {
    this.sessions.push(input);
    return 'https://billing.stripe.com/p/session/test_portal';
  }
}

export class StripeBillingPortalGateway extends BillingPortalGateway {
  constructor(
    private readonly secretKey: string,
    private readonly configurationId: string,
    private readonly request: typeof fetch = fetch,
  ) {
    super();
  }

  async createSession(input: CreatePortalSession) {
    const response = await this.request(
      'https://api.stripe.com/v1/billing_portal/sessions',
      {
        body: new URLSearchParams({
          configuration: this.configurationId,
          customer: input.customerId,
          return_url: input.returnUrl,
        }),
        headers: {
          authorization: `Bearer ${this.secretKey}`,
          'content-type': 'application/x-www-form-urlencoded',
          'idempotency-key': input.idempotencyKey,
        },
        method: 'POST',
      },
    );
    if (!response.ok) throw new Error('Stripe Customer Portal is unavailable.');

    const payload: unknown = await response.json();
    const portalUrl =
      typeof payload === 'object' && payload !== null && 'url' in payload
        ? payload.url
        : undefined;
    if (
      typeof portalUrl !== 'string' ||
      new URL(portalUrl).origin !== 'https://billing.stripe.com'
    ) {
      throw new Error('Stripe Customer Portal returned an invalid URL.');
    }
    return portalUrl;
  }
}
