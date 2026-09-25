import { AuditEventRepository, type AuditEvent } from './audit-event.js';

export class MemoryAuditEventRepository extends AuditEventRepository {
  private readonly events: AuditEvent[] = [];

  async append(event: AuditEvent) {
    this.events.push(this.clone(event));
  }

  async list(organizationId: string) {
    return this.events
      .filter((event) => event.organizationId === organizationId)
      .toReversed()
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
