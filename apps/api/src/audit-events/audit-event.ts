export type AuditActor = { id: string; type: 'operator' | 'user' };
export const auditActions = [
  'billing.checkout-session.create-requested',
  'billing.portal-session.create-requested',
  'billing.subscription.replay-requested',
  'organization.created',
  'organization.data-export.requested',
  'organization.invitation.accept-requested',
  'organization.invitation.create-requested',
  'organization.invitation.resend-requested',
  'organization.invitation.revoke-requested',
  'organization.membership.remove-requested',
  'organization.membership.update-requested',
  'organization.settings.update-requested',
] as const;
export type AuditAction = (typeof auditActions)[number];
export const auditTargetTypes = [
  'invitation',
  'membership',
  'organization',
  'subscription',
] as const;
export type AuditTarget = {
  id: string;
  type: (typeof auditTargetTypes)[number];
};
export type AuditContext = Record<
  string,
  boolean | number | string | string[] | null
>;

export interface AuditEvent {
  action: AuditAction;
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
  abstract list(input: {
    before?: Pick<AuditEvent, 'id' | 'occurredAt'>;
    limit: number;
    organizationId: string;
  }): Promise<AuditEvent[]>;
}
