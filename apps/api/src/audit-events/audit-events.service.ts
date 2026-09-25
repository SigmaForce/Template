import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permission.js';
import { AuditEventRepository, type NewAuditEvent } from './audit-event.js';

@Injectable()
export class AuditEventsService {
  constructor(
    private readonly repository: AuditEventRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async record(event: NewAuditEvent) {
    await this.repository.append({
      ...event,
      id: randomUUID(),
      occurredAt: event.occurredAt ?? new Date(),
    });
  }

  async list(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationAuditEventsRead,
      targetOrganizationId: organizationId,
      user,
    });
    const events = await this.repository.list(scope.organizationId);
    return {
      items: events.map(({ organizationId: _organizationId, ...event }) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
    };
  }
}
