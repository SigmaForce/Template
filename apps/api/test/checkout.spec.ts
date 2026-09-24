import { describe, expect, it, vi } from 'vitest';
import { StripeCheckoutGateway } from '../src/billing/checkout.js';
import { StripeBillingPortalGateway } from '../src/billing/portal.js';

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

describe('StripeBillingPortalGateway', () => {
  it('sends only the projected Customer and allowlisted return URL to Stripe', async () => {
    const request = vi.fn(
      async (_input: string | URL | Request, _options?: RequestInit) =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              url: 'https://billing.stripe.com/p/session/test_portal',
            }),
            { status: 200 },
          ),
        ),
    );
    const gateway = new StripeBillingPortalGateway(
      'sk_test_serverOnlySecret',
      'bpc_portalTest',
      request,
    );

    await expect(
      gateway.createSession({
        customerId: 'cus_portal',
        idempotencyKey: 'portal-session:org_portal:request-1',
        returnUrl: 'https://app.example.com/settings/billing',
      }),
    ).resolves.toBe('https://billing.stripe.com/p/session/test_portal');

    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://api.stripe.com/v1/billing_portal/sessions');
    expect(options?.headers).toEqual({
      authorization: 'Bearer sk_test_serverOnlySecret',
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': 'portal-session:org_portal:request-1',
    });
    const body = options?.body?.toString() ?? '';
    expect(body).toContain('customer=cus_portal');
    expect(body).toContain('configuration=bpc_portalTest');
    expect(body).toContain(
      'return_url=https%3A%2F%2Fapp.example.com%2Fsettings%2Fbilling',
    );
    expect(body).not.toMatch(/organization|serverOnlySecret/i);
  });
});
