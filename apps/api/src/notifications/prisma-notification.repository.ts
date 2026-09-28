import { type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  NotificationRepository,
  type NotificationAttempt,
  type NotificationRecord,
  type NotificationStatus,
} from './notification.js';
export class PrismaNotificationRepository
  extends NotificationRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;
  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }
  async create(record: NotificationRecord) {
    try {
      return (await this.client.notification.create({
        data: record as never,
      })) as unknown as NotificationRecord;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') return null;
      throw error;
    }
  }
  async find(id: string) {
    return (await this.client.notification.findUnique({
      where: { id },
    })) as unknown as NotificationRecord | null;
  }
  async findForOrganization(id: string, organizationId: string) {
    return (await this.client.notification.findFirst({
      where: { id, organizationId },
    })) as unknown as NotificationRecord | null;
  }
  async startAttempt(id: string) {
    const record = await this.client.notification.update({
      where: { id },
      data: { attemptCount: { increment: 1 } },
    });
    return (await this.client.notificationAttempt.create({
      data: {
        notificationId: id,
        number: record.attemptCount,
        status: 'pending',
      },
    })) as unknown as NotificationAttempt;
  }
  async finishAttempt(input: {
    id: string;
    status: 'sent' | 'failed';
    error?: string;
  }) {
    await this.client.notificationAttempt.update({
      where: { id: input.id },
      data: { status: input.status, error: input.error },
    });
  }
  async setStatus(id: string, status: NotificationStatus, sentAt?: Date) {
    await this.client.notification.update({
      where: { id },
      data: { status, sentAt },
    });
  }
  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
