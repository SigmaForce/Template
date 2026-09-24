import { type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import {
  BillingRepository,
  type BillingInboxEvent,
  type SubscriptionStatus,
} from './billing.js';

export class PrismaBillingRepository
  extends BillingRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async storeEvent(event: BillingInboxEvent) {
    try {
      await this.client.billingInboxEvent.create({
        data: {
          eventId: event.id,
          organizationId: event.organizationId,
          type: event.type,
          providerSubscriptionId: event.providerSubscriptionId,
          providerCustomerId: event.providerCustomerId,
          priceId: event.priceId,
          scheduledPriceId: event.scheduledPriceId,
          subscriptionStatus: event.status,
          cancelAtPeriodEnd: event.cancelAtPeriodEnd,
          currentPeriodEndsAt: event.currentPeriodEndsAt,
          providerCreatedAt: event.createdAt,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });
      return 'stored' as const;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return 'duplicate' as const;
      }
      throw error;
    }
  }

  async findSubscription(organizationId: string) {
    const subscription = await this.client.subscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) return undefined;
    return {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEndsAt: subscription.currentPeriodEndsAt,
      organizationId: subscription.organizationId,
      ...(subscription.pastDueAt && { pastDueAt: subscription.pastDueAt }),
      planId: subscription.planId as 'launch' | 'scale',
      planVersion: subscription.planVersion,
      providerEventCreatedAt: subscription.providerEventCreatedAt,
      ...(subscription.providerScheduleEventCreatedAt && {
        providerScheduleEventCreatedAt:
          subscription.providerScheduleEventCreatedAt,
      }),
      ...(subscription.providerCustomerId && {
        providerCustomerId: subscription.providerCustomerId,
      }),
      providerSubscriptionId: subscription.providerSubscriptionId,
      ...(subscription.scheduledPlanId && {
        scheduledPlanId: subscription.scheduledPlanId as 'launch' | 'scale',
      }),
      status: subscription.status as SubscriptionStatus,
    };
  }

  async findUnscopedEventIds(providerSubscriptionId: string) {
    const events = await this.client.billingInboxEvent.findMany({
      select: { eventId: true },
      where: {
        organizationId: null,
        processedAt: null,
        providerSubscriptionId,
      },
    });
    return events.map((event) => event.eventId);
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
