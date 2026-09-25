import { type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  AuditEventRepository,
  type AuditEvent,
  type AuditContext,
} from './audit-event.js';

export class PrismaAuditEventRepository
  extends AuditEventRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async append(event: AuditEvent) {
    await this.client.auditEvent.create({
      data: {
        action: event.action,
        actorId: event.actor.id,
        actorType: event.actor.type,
        context: event.context,
        id: event.id,
        occurredAt: event.occurredAt,
        organizationId: event.organizationId,
        targetId: event.target.id,
        targetType: event.target.type,
      },
    });
  }

  async list(organizationId: string) {
    const events = await this.client.auditEvent.findMany({
      where: { organizationId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    return events.map((event): AuditEvent => ({
      action: event.action,
      actor: {
        id: event.actorId,
        type: event.actorType as AuditEvent['actor']['type'],
      },
      context: event.context as AuditContext,
      id: event.id,
      occurredAt: event.occurredAt,
      organizationId: event.organizationId,
      target: { id: event.targetId, type: event.targetType },
    }));
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
