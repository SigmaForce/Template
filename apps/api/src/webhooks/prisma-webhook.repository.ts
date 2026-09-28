import { type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  WebhookRepository,
  type WebhookDelivery,
  type WebhookDeliveryAttempt,
  type WebhookEndpoint,
  type WebhookDeliveryStatus,
} from './webhook.js';

export class PrismaWebhookRepository
  extends WebhookRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;
  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }
  async createEndpoint(endpoint: WebhookEndpoint) {
    return this.client.webhookEndpoint.create({ data: endpoint });
  }
  async listEndpoints(organizationId: string) {
    return this.client.webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
  async findEndpoint(id: string) {
    return this.client.webhookEndpoint.findUnique({ where: { id } });
  }
  async updateEndpoint(
    input: Pick<WebhookEndpoint, 'id' | 'organizationId' | 'enabled'>,
  ) {
    return (
      (
        await this.client.webhookEndpoint.updateMany({
          where: { id: input.id, organizationId: input.organizationId },
          data: { enabled: input.enabled },
        })
      ).count > 0
    );
  }
  async createDelivery(delivery: WebhookDelivery) {
    try {
      return (await this.client.webhookDelivery.create({
        data: delivery as never,
      })) as unknown as WebhookDelivery;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return null;
      throw error;
    }
  }
  async findDelivery(id: string) {
    return (await this.client.webhookDelivery.findUnique({
      where: { id },
    })) as unknown as WebhookDelivery | null;
  }
  async startAttempt(deliveryId: string) {
    const delivery = await this.client.webhookDelivery.update({
      where: { id: deliveryId },
      data: { attemptCount: { increment: 1 }, lastAttemptAt: new Date() },
    });
    return (await this.client.webhookDeliveryAttempt.create({
      data: { deliveryId, number: delivery.attemptCount, status: 'pending' },
    })) as unknown as WebhookDeliveryAttempt;
  }
  async finishAttempt(input: {
    id: string;
    status: 'succeeded' | 'failed';
    responseStatus?: number;
    error?: string;
  }) {
    await this.client.webhookDeliveryAttempt.update({
      where: { id: input.id },
      data: {
        status: input.status,
        responseStatus: input.responseStatus,
        error: input.error,
      },
    });
  }
  async setDeliveryStatus(id: string, status: WebhookDeliveryStatus) {
    await this.client.webhookDelivery.update({
      where: { id },
      data: { status },
    });
  }
  async listAttempts(deliveryId: string) {
    return (await this.client.webhookDeliveryAttempt.findMany({
      where: { deliveryId },
      orderBy: { number: 'asc' },
    })) as unknown as WebhookDeliveryAttempt[];
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
