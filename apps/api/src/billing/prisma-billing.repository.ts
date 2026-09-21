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
          priceId: event.priceId,
          subscriptionStatus: event.status,
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
      ...subscription,
      planId: subscription.planId as 'launch' | 'scale',
      status: subscription.status as SubscriptionStatus,
    };
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
