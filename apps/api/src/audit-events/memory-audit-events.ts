import { AuditEventRepository, type AuditEvent } from './audit-event.js';

export class MemoryAuditEventRepository extends AuditEventRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent) {
    this.events.push(this.clone(event));
  }

  async list(input: {
    before?: Pick<AuditEvent, 'id' | 'occurredAt'>;
    limit: number;
    organizationId: string;
  }) {
    return this.events
      .filter((event) => event.organizationId === input.organizationId)
      .sort(
        (left, right) =>
          right.occurredAt.getTime() - left.occurredAt.getTime() ||
          (right.id < left.id ? -1 : right.id > left.id ? 1 : 0),
      )
      .filter(
        (event) =>
          !input.before ||
          event.occurredAt < input.before.occurredAt ||
          (event.occurredAt.getTime() === input.before.occurredAt.getTime() &&
            event.id < input.before.id),
      )
      .slice(0, input.limit)
      .map((event) => this.clone(event));
  }

  private clone(event: AuditEvent): AuditEvent {
    return {
      ...event,
      actor: { ...event.actor },
      context: structuredClone(event.context),
      occurredAt: new Date(event.occurredAt),
      target: { ...event.target },
    };
  }
}
