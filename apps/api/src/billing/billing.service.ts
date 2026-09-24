import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Capability } from '../authorization/authorization.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { BillingProjectionQueue, BillingRepository } from './billing.js';
import { BillingCheckoutGateway } from './checkout.js';
import type { CreateCheckoutSessionDto } from './checkout.dto.js';
import type { StripePlanMappings } from './subscription-projection.js';
import { BillingPortalGateway } from './portal.js';
import type { CreatePortalSessionDto } from './portal.dto.js';
import {
  InvalidStripeWebhookError,
  StripeWebhookVerifier,
} from './stripe-webhook.js';

@Injectable()
export class BillingService {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly repository: BillingRepository,
    private readonly queue: BillingProjectionQueue,
    private readonly webhooks: StripeWebhookVerifier,
    private readonly checkout: BillingCheckoutGateway,
    private readonly portal: BillingPortalGateway,
    @Inject('CHECKOUT_RETURN_ORIGINS')
    private readonly checkoutReturnOrigins: string[],
    @Inject('STRIPE_PLAN_MAPPINGS')
    private readonly planMappings: StripePlanMappings,
  ) {}

  async createPortalSession(
    user: AuthenticatedUser,
    organizationId: string,
    idempotencyKey: string,
    input: CreatePortalSessionDto,
  ) {
    const scope = await this.authorization.authorize({
      capability: Capability.billing,
      permission: Permission.billingManage,
      targetOrganizationId: organizationId,
      user,
    });
    const subscription = await this.repository.findSubscription(
      scope.organizationId,
    );
    if (!subscription?.providerCustomerId) {
      throw PublicProblemException.billingPortalUnavailable();
    }
    const portalUrl = await this.portal.createSession({
      idempotencyKey: `portal-session:${scope.organizationId}:${idempotencyKey}`,
      customerId: subscription.providerCustomerId,
      returnUrl: this.allowlistedReturnUrl(input.returnUrl),
    });
    return { portalUrl };
  }

  async createCheckoutSession(
    user: AuthenticatedUser,
    organizationId: string,
    input: CreateCheckoutSessionDto,
  ) {
    const scope = await this.authorization.authorize({
      capability: Capability.billing,
      permission: Permission.billingManage,
      targetOrganizationId: organizationId,
      user,
    });
    const subscription = await this.repository.findSubscription(
      scope.organizationId,
    );
    if (
      subscription &&
      !['canceled', 'incomplete_expired'].includes(subscription.status)
    ) {
      throw PublicProblemException.subscriptionAlreadyExists();
    }
    const successUrl = this.allowlistedReturnUrl(input.successUrl);
    const cancelUrl = this.allowlistedReturnUrl(input.cancelUrl);
    const checkoutUrl = await this.checkout.createSession({
      cancelUrl,
      idempotencyKey: `checkout-session:${scope.organizationId}`,
      organizationId: scope.organizationId,
      priceId: this.planMappings[input.planId].priceId,
      successUrl,
    });
    return { checkoutUrl };
  }

  async getSubscription(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      capability: Capability.billing,
      permission: Permission.billingManage,
      targetOrganizationId: organizationId,
      user,
    });
    const subscription = await this.repository.findSubscription(
      scope.organizationId,
    );
    if (!subscription) throw PublicProblemException.subscriptionUnavailable();

    return {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt.toISOString(),
      pastDueAt: subscription.pastDueAt?.toISOString() ?? null,
      planId: subscription.planId,
      planVersion: subscription.planVersion,
      providerSubscriptionId: subscription.providerSubscriptionId,
      scheduledPlanId: subscription.cancelAtPeriodEnd
        ? null
        : (subscription.scheduledPlanId ?? null),
      status: subscription.status,
    };
  }

  async receiveStripeEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ) {
    try {
      const event = this.webhooks.verify(rawBody, signature);
      await this.repository.storeEvent(event);
      await this.queue.enqueue(event.id);
      if (event.organizationId) {
        const pendingEventIds = await this.repository.findUnscopedEventIds(
          event.providerSubscriptionId,
        );
        await Promise.all(
          pendingEventIds.map((eventId) =>
            this.queue.enqueue(eventId, event.id),
          ),
        );
      }
      return { received: true };
    } catch (error) {
      if (error instanceof InvalidStripeWebhookError) {
        throw PublicProblemException.invalidWebhookSignature();
      }
      throw error;
    }
  }

  private allowlistedReturnUrl(value: string) {
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      !this.checkoutReturnOrigins.includes(url.origin)
    ) {
      throw PublicProblemException.validation([
        {
          detail: 'URL origin is not allowed for Checkout returns.',
          pointer: '#/body',
        },
      ]);
    }
    return url.toString();
  }
}
