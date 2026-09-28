import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync, sign } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { MemoryApiKeyRepository } from '../src/api-keys/memory-api-keys.js';
import { MemoryAuditEventRepository } from '../src/audit-events/memory-audit-events.js';
import { MemoryOrganizationOnboardingUnitOfWork } from '../src/application/organization-onboarding.js';
import {
  BillingProjectionRepository,
  type StripePlanMappings,
} from '../src/billing/subscription-projection.js';
import {
  SubscriptionAuthority,
  type SubscriptionAuthoritySnapshot,
} from '../src/billing/subscription-reconciliation.js';
import { MemoryBillingCheckoutGateway } from '../src/billing/checkout.js';
import {
  MemoryBillingProjectionQueue,
  MemoryBillingRepository,
} from '../src/billing/memory-billing.js';
import { MemoryBillingPortalGateway } from '../src/billing/portal.js';
import type { SubscriptionProjection } from '../src/billing/billing.js';
import { configureApi } from '../src/configure-api.js';
import { JwtOperatorSessionVerifier } from '../src/operators/jwt-operator-session.verifier.js';
import { MemoryOperatorSessionRepository } from '../src/operators/memory-operator-sessions.js';
import {
  MemoryOrganizationDirectory,
  MemoryOrganizationRepository,
} from '../src/organizations/memory-organizations.js';
import {
  authenticationPublicKey,
  createSessionToken,
} from './session-token.js';

const organization = {
  id: 'org_operator',
  name: 'Operator Labs',
  slug: 'operator-labs',
  locale: 'en-US',
  timeZone: 'UTC',
  state: 'active' as const,
};
const otherOrganization = {
  ...organization,
  id: 'org_other_operator',
  slug: 'other-operator-labs',
};
const planMappings: StripePlanMappings = {
  launch: { priceId: 'price_launchTest', productId: 'prod_launchTest' },
  scale: { priceId: 'price_scaleTest', productId: 'prod_scaleTest' },
};
const { privateKey: operatorPrivateKey, publicKey: operatorPublicKey } =
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

class TestAuthority extends SubscriptionAuthority {
  constructor(private readonly subscription: SubscriptionAuthoritySnapshot) {
    super();
  }

  async findSubscription(providerSubscriptionId: string) {
    if (providerSubscriptionId === this.subscription.providerSubscriptionId) {
      return this.subscription;
    }
    if (providerSubscriptionId === 'sub_foreign') {
      return {
        ...this.subscription,
        organizationId: otherOrganization.id,
        providerSubscriptionId,
      };
    }
    return undefined;
  }
}

class TestProjections extends BillingProjectionRepository {
  constructor(public subscription: SubscriptionProjection) {
    super();
  }

  async findSubscription() {
    return this.subscription;
  }

  async project(): Promise<never> {
    throw new Error('Not used by Operator API tests.');
  }

  async findReplaySubscription() {
    return { ...this.subscription, planId: 'scale' as const };
  }

  async rebuildSubscription() {
    this.subscription = { ...this.subscription, planId: 'scale' };
    return this.subscription;
  }
}

function createOperatorToken(input?: {
  expiresAt?: number;
  sessionId?: string;
}) {
  const now = Math.floor(Date.now() / 1_000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      aud: 'next-nest-saas-api',
      exp: input?.expiresAt ?? now + 60,
      iat: now,
      iss: 'next-nest-saas-operators',
      nbf: now - 1,
      sid: input?.sessionId ?? 'opsess_test',
      sub: 'operator_support',
    }),
  ).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(unsigned),
    operatorPrivateKey,
  ).toString('base64url');
  return `${unsigned}.${signature}`;
}

describe('Operator boundary (e2e)', () => {
  let app: INestApplication;
  let auditEvents: MemoryAuditEventRepository;
  let operatorSessions: MemoryOperatorSessionRepository;
  let projections: TestProjections;

  beforeEach(async () => {
    auditEvents = new MemoryAuditEventRepository();
    operatorSessions = new MemoryOperatorSessionRepository([
      {
        expiresAt: new Date(Date.now() + 60_000),
        id: 'opsess_test',
        operatorId: 'operator_support',
        organizationIds: [organization.id],
        permissions: [
          'billing:subscriptions:reconcile',
          'billing:subscriptions:repair',
        ],
        revokedAt: null,
      },
      {
        expiresAt: new Date(Date.now() + 60_000),
        id: 'opsess_reconcile',
        operatorId: 'operator_support',
        organizationIds: [organization.id],
        permissions: ['billing:subscriptions:reconcile'],
        revokedAt: null,
      },
    ]);
    projections = new TestProjections({
      currentPeriodEndsAt: new Date('2026-10-20T12:00:00.000Z'),
      organizationId: organization.id,
      planId: 'launch',
      planVersion: 1,
      providerEventCreatedAt: new Date('2026-09-20T12:00:00.000Z'),
      providerSubscriptionId: 'sub_operator',
      status: 'active',
    });
    const organizations = new MemoryOrganizationRepository({
      organizations: [organization, otherOrganization],
      memberships: [
        {
          organizationId: organization.id,
          role: 'owner',
          status: 'active',
          userId: 'user_owner',
        },
      ],
    });
    const module = await Test.createTestingModule({
      imports: [
        AppModule.register({
          apiKeys: { repository: new MemoryApiKeyRepository() },
          auditEvents: { repository: auditEvents },
          authentication: {
            authorizedParties: ['http://localhost:3000'],
            jwtKey: authenticationPublicKey,
          },
          billing: {
            checkoutGateway: new MemoryBillingCheckoutGateway(),
            checkoutReturnOrigins: ['http://localhost:3000'],
            planMappings,
            portalGateway: new MemoryBillingPortalGateway(),
            projectionQueue: new MemoryBillingProjectionQueue(),
            repository: new MemoryBillingRepository(),
            stripeWebhookSecret: 'whsec_testWebhookSecret',
          },
          operators: {
            authority: new TestAuthority({
              cancelAtPeriodEnd: false,
              currentPeriodEndsAt: projections.subscription.currentPeriodEndsAt,
              organizationId: organization.id,
              planId: 'scale',
              planVersion: 1,
              providerSubscriptionId: 'sub_operator',
              status: 'active',
            }),
            projections,
            sessionVerifier: new JwtOperatorSessionVerifier(
              operatorPublicKey,
              operatorSessions,
            ),
          },
          organizations: {
            directory: new MemoryOrganizationDirectory(),
            onboarding: new MemoryOrganizationOnboardingUnitOfWork(
              (record) => organizations.reserveOnboarding(record),
              (record) => organizations.completeOnboarding(record),
              (record) => organizations.releaseOnboardingReservation(record),
              auditEvents,
            ),
            repository: organizations,
          },
        }),
      ],
    }).compile();
    app = module.createNestApplication({ rawBody: true });
    configureApi(app);
    await app.init();
  });

  afterEach(async () => app.close());

  it('keeps Operator and Organization User sessions on separate boundaries', async () => {
    const operator = `Bearer ${createOperatorToken()}`;
    const owner = `Bearer ${createSessionToken({
      organization,
      organizationRole: 'owner',
      userId: 'user_owner',
    })}`;
    const route = `/v1/internal/organizations/${organization.id}/billing/subscriptions/sub_operator/reconciliation`;

    await request(app.getHttpServer())
      .get(route)
      .set('authorization', operator)
      .expect(200)
      .expect('cache-control', 'private, no-store')
      .expect(({ body }) => expect(body.status).toBe('drifted'));
    await request(app.getHttpServer())
      .get(route)
      .set('authorization', owner)
      .expect(401);
    await request(app.getHttpServer())
      .get(route)
      .set(
        'authorization',
        `Bearer ${createOperatorToken({
          expiresAt: Math.floor(Date.now() / 1_000) - 1,
        })}`,
      )
      .expect(401);
    await request(app.getHttpServer())
      .get(
        `/v1/internal/organizations/${otherOrganization.id}/billing/subscriptions/sub_operator/reconciliation`,
      )
      .set('authorization', operator)
      .expect(403);
    const foreign = await request(app.getHttpServer())
      .get(
        `/v1/internal/organizations/${organization.id}/billing/subscriptions/sub_foreign/reconciliation`,
      )
      .set('authorization', operator)
      .expect(200);
    const missing = await request(app.getHttpServer())
      .get(
        `/v1/internal/organizations/${organization.id}/billing/subscriptions/sub_missing/reconciliation`,
      )
      .set('authorization', operator)
      .expect(200);
    expect(foreign.body.status).toBe('missing-authority');
    expect(missing.body.status).toBe('missing-authority');
    await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('authorization', operator)
      .expect(401);
    const events = await auditEvents.list({
      limit: 10,
      organizationId: organization.id,
    });
    expect(events).toHaveLength(3);
    expect(
      events.every(
        (event) =>
          event.action === 'billing.subscription.reconcile-requested' &&
          event.actor.id === 'operator_support' &&
          event.actor.type === 'operator',
      ),
    ).toBe(true);
    await operatorSessions.revoke('opsess_test', new Date());
    await request(app.getHttpServer())
      .get(route)
      .set('authorization', operator)
      .expect(401);
  });

  it('requires the repair permission and records the Operator audit actor', async () => {
    const route = `/v1/internal/organizations/${organization.id}/billing/subscriptions/sub_operator/repair`;
    await request(app.getHttpServer())
      .post(route)
      .set(
        'authorization',
        `Bearer ${createOperatorToken({
          sessionId: 'opsess_reconcile',
        })}`,
      )
      .expect(403);

    await request(app.getHttpServer())
      .post(route)
      .set('authorization', `Bearer ${createOperatorToken()}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('in-sync'));

    expect(
      await auditEvents.list({ limit: 10, organizationId: organization.id }),
    ).toEqual([
      expect.objectContaining({
        action: 'billing.subscription.replay-requested',
        actor: { id: 'operator_support', type: 'operator' },
        organizationId: organization.id,
        target: { id: 'sub_operator', type: 'subscription' },
      }),
    ]);
  });
});
