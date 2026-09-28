export type AuditActor = { id: string; type: 'operator' | 'user' };
export const auditActions = [
  'billing.checkout-session.create-requested',
  'billing.portal-session.create-requested',
  'billing.subscription.reconcile-requested',
  'billing.subscription.replay-requested',
  'organization.api-key.create-requested',
  'organization.api-key.revoke-requested',
  'organization.api-key.rotate-requested',
  'organization.created',
  'organization.data-export.requested',
  'organization.file.delete-requested',
  'organization.file.download-requested',
  'organization.file.upload-requested',
  'organization.webhook-endpoint.create-requested',
  'organization.webhook-endpoint.update-requested',
  'organization.webhook-delivery.replay-requested',
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
  'api-key',
  'file',
  'invitation',
  'membership',
  'organization',
  'subscription',
  'webhook-delivery',
  'webhook-endpoint',
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
