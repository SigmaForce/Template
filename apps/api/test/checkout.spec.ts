import { describe, expect, it, vi } from 'vitest';
import { StripeCheckoutGateway } from '../src/billing/checkout.js';

describe('StripeCheckoutGateway', () => {
  it('sends only server-owned Checkout configuration to Stripe', async () => {
    const request = vi.fn(
      async (_input: string | URL | Request, _options?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              url: 'https://checkout.stripe.com/c/pay/cs_test_checkout',
            }),
            { status: 200 },
          ),
        ),
    );
    const gateway = new StripeCheckoutGateway(
      'sk_test_serverOnlySecret',
      request,
    );

    await expect(
      gateway.createSession({
        cancelUrl: 'https://app.example.com/settings/billing',
        idempotencyKey: 'checkout-session:org_checkout',
        organizationId: 'org_checkout',
        priceId: 'price_launchTest',
        successUrl: 'https://app.example.com/settings/billing/success',
      }),
    ).resolves.toBe('https://checkout.stripe.com/c/pay/cs_test_checkout');

    const [, options] = request.mock.calls[0];
    expect(options?.headers).toEqual({
      authorization: 'Bearer sk_test_serverOnlySecret',
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': 'checkout-session:org_checkout',
    });
    const body = options?.body?.toString() ?? '';
    expect(body).toContain('mode=subscription');
    expect(body).toContain('line_items%5B0%5D%5Bprice%5D=price_launchTest');
    expect(body).toContain('metadata%5BorganizationId%5D=org_checkout');
    expect(body).not.toMatch(/card|serverOnlySecret/i);
  });
});
