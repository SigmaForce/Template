import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { AuditEventRepository, type NewAuditEvent } from './audit-event.js';
import type { ListAuditEventsQuery } from './list-audit-events.query.js';

const cursorScope = 'organization-audit-events';
const cursorSort = 'occurredAt-desc,id-desc';

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

  async list(
    user: AuthenticatedUser,
    organizationId: string,
    query: ListAuditEventsQuery,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationAuditEventsRead,
      targetOrganizationId: organizationId,
      user,
    });
    const before = query.cursor
      ? this.decodeCursor(query.cursor, scope.organizationId)
      : undefined;
    const events = await this.repository.list({
      before,
      limit: query.limit + 1,
      organizationId: scope.organizationId,
    });
    const hasNextPage = events.length > query.limit;
    const page = events.slice(0, query.limit);
    const lastEvent = page.at(-1);
    return {
      items: page.map(({ organizationId: _organizationId, ...event }) => ({
        ...event,
        occurredAt: event.occurredAt.toISOString(),
      })),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && lastEvent
            ? this.encodeCursor(lastEvent, scope.organizationId)
            : null,
      },
    };
  }

  private encodeCursor(
    event: { id: string; occurredAt: Date },
    organizationId: string,
  ) {
    return Buffer.from(
      JSON.stringify({
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        organizationId,
        scope: cursorScope,
        sort: cursorSort,
        version: 1,
      }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string, organizationId: string) {
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        typeof payload !== 'object' ||
        payload === null ||
        !('version' in payload) ||
        payload.version !== 1 ||
        !('scope' in payload) ||
        payload.scope !== cursorScope ||
        !('sort' in payload) ||
        payload.sort !== cursorSort ||
        !('organizationId' in payload) ||
        payload.organizationId !== organizationId ||
        !('id' in payload) ||
        typeof payload.id !== 'string' ||
        !('occurredAt' in payload) ||
        typeof payload.occurredAt !== 'string'
      ) {
        throw new Error('Invalid Audit Event cursor.');
      }
      const occurredAt = new Date(payload.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) {
        throw new Error('Invalid Audit Event cursor time.');
      }
      return { id: payload.id, occurredAt };
    } catch {
      throw PublicProblemException.validation([
        {
          pointer: '#/query/cursor',
          detail: 'cursor is invalid for the requested Audit Event collection',
        },
      ]);
    }
  }
}
