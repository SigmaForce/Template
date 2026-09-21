import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Capability } from '../authorization/authorization.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { BillingProjectionQueue, BillingRepository } from './billing.js';
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
  ) {}

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
      currentPeriodEndsAt: subscription.currentPeriodEndsAt.toISOString(),
      planId: subscription.planId,
      planVersion: subscription.planVersion,
      providerSubscriptionId: subscription.providerSubscriptionId,
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
      return { received: true };
    } catch (error) {
      if (error instanceof InvalidStripeWebhookError) {
        throw PublicProblemException.invalidWebhookSignature();
      }
      throw error;
    }
  }
}
