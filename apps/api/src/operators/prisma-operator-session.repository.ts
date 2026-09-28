import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import {
  OperatorSessionRepository,
  type OperatorPermission,
} from './operator.js';

export class PrismaOperatorSessionRepository
  extends OperatorSessionRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async find(id: string) {
    const session = await this.client.operatorSession.findUnique({
      where: { id },
    });
    if (!session) return undefined;
    return {
      expiresAt: session.expiresAt,
      id: session.id,
      operatorId: session.operatorId,
      organizationIds: session.organizationIds,
      permissions: session.permissions as OperatorPermission[],
      revokedAt: session.revokedAt,
      sessionId: session.id,
    };
  }

  async revoke(id: string, revokedAt: Date) {
    const result = await this.client.operatorSession.updateMany({
      data: { revokedAt },
      where: { id, revokedAt: null },
    });
    return result.count === 1;
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
