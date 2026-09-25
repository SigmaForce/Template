export type AuditActor = { id: string; type: 'operator' | 'user' };
export type AuditTarget = { id: string; type: string };
export type AuditContext = Record<
  string,
  boolean | number | string | string[] | null
>;

export interface AuditEvent {
  action: string;
  actor: AuditActor;
  context: AuditContext;
  id: string;
  occurredAt: Date;
  organizationId: string;
  target: AuditTarget;
}

export type NewAuditEvent = Omit<AuditEvent, 'id' | 'occurredAt'> & {
  occurredAt?: Date;
};

export abstract class AuditEventRepository {
  abstract append(event: AuditEvent): Promise<void>;
  abstract list(organizationId: string): Promise<AuditEvent[]>;
}
