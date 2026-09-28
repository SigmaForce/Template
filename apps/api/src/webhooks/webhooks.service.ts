import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuditEventsService } from '../audit-events/audit-events.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import {
  WebhookDeliveryQueue,
  WebhookRepository,
  type WebhookDelivery,
  type WebhookEndpoint,
} from './webhook.js';
import type { CreateWebhookEndpointDto } from './webhook.dto.js';

function privateAddress(value: string) {
  const host = value.toLowerCase();
  if (
    host === '::1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80')
  )
    return true;
  if (isIP(host) !== 4) return false;
  const parts = host.split('.').map(Number);
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    parts.every((part) => part === 0)
  );
}
export async function assertSafeWebhookUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw PublicProblemException.validation([
      { pointer: '#/body/url', detail: 'URL must be valid.' },
    ]);
  }
  const host = url.hostname.toLowerCase();
  const addresses = await lookup(host, { all: true }).catch(() => []);
  const privateHost =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    privateAddress(host) ||
    addresses.some(({ address }) => privateAddress(address));
  if (url.protocol !== 'https:' || privateHost || addresses.length === 0)
    throw PublicProblemException.validation([
      {
        pointer: '#/body/url',
        detail: 'Webhook URL must use HTTPS and a public host.',
      },
    ]);
  return url.toString();
}
export function signWebhook(
  endpoint: WebhookEndpoint,
  delivery: WebhookDelivery,
) {
  const body = JSON.stringify({
    id: delivery.id,
    type: delivery.eventType,
    version: delivery.version,
    occurredAt: delivery.occurredAt.toISOString(),
    data: delivery.payload,
  });
  const timestamp = Math.floor(delivery.occurredAt.getTime() / 1000);
  return {
    body,
    timestamp,
    signature: `v1,${createHmac('sha256', endpoint.secret).update(`${delivery.id}.${timestamp}.${body}`).digest('base64')}`,
  };
}

@Injectable()
export class WebhooksService {
  constructor(
    private readonly repository: WebhookRepository,
    private readonly queue: WebhookDeliveryQueue,
    private readonly authorization: AuthorizationService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async create(
    user: AuthenticatedUser,
    organizationId: string,
    input: CreateWebhookEndpointDto,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationWebhooksManage,
      targetOrganizationId: organizationId,
      user,
    });
    const secret = `whsec_${randomBytes(32).toString('base64url')}`;
    const endpoint: WebhookEndpoint = {
      id: randomUUID(),
      organizationId: scope.organizationId,
      url: await assertSafeWebhookUrl(input.url),
      events: input.events,
      secret,
      enabled: true,
      createdByUserId: user.id,
      createdAt: new Date(),
    };
    await this.repository.createEndpoint(endpoint);
    await this.auditEvents.record({
      action: 'organization.webhook-endpoint.create-requested',
      actor: { id: user.id, type: 'user' },
      context: { events: endpoint.events, url: endpoint.url },
      organizationId: endpoint.organizationId,
      target: { id: endpoint.id, type: 'webhook-endpoint' },
    });
    return { endpoint: this.toDto(endpoint), secret };
  }
  async list(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationWebhooksManage,
      targetOrganizationId: organizationId,
      user,
    });
    return {
      items: (await this.repository.listEndpoints(scope.organizationId)).map(
        (item) => this.toDto(item),
      ),
    };
  }
  async update(
    user: AuthenticatedUser,
    organizationId: string,
    endpointId: string,
    enabled: boolean,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationWebhooksManage,
      targetOrganizationId: organizationId,
      user,
    });
    const endpoint = await this.repository.findEndpoint(endpointId);
    if (
      !endpoint ||
      endpoint.organizationId !== scope.organizationId ||
      !(await this.repository.updateEndpoint({
        id: endpointId,
        organizationId: scope.organizationId,
        enabled,
      }))
    )
      throw PublicProblemException.fileUnavailable();
    await this.auditEvents.record({
      action: 'organization.webhook-endpoint.update-requested',
      actor: { id: user.id, type: 'user' },
      context: { enabled },
      organizationId: scope.organizationId,
      target: { id: endpoint.id, type: 'webhook-endpoint' },
    });
    return this.toDto({ ...endpoint, enabled });
  }
  async emit(input: {
    endpointId: string;
    eventType: string;
    payload: Record<string, unknown>;
    occurredAt?: Date;
    eventId?: string;
  }) {
    const endpoint = await this.repository.findEndpoint(input.endpointId);
    if (
      !endpoint ||
      !endpoint.enabled ||
      !endpoint.events.includes(input.eventType)
    )
      return null;
    const delivery: WebhookDelivery = {
      id: input.eventId ?? randomUUID(),
      endpointId: endpoint.id,
      organizationId: endpoint.organizationId,
      eventType: input.eventType,
      version: 'v1',
      payload: input.payload,
      occurredAt: input.occurredAt ?? new Date(),
      status: 'pending',
      attemptCount: 0,
      createdAt: new Date(),
      lastAttemptAt: null,
    };
    const created = await this.repository.createDelivery(delivery);
    if (created) await this.queue.enqueue(created.id);
    return created;
  }
  async replay(
    user: AuthenticatedUser,
    organizationId: string,
    endpointId: string,
    deliveryId: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationWebhooksManage,
      targetOrganizationId: organizationId,
      user,
    });
    const endpoint = await this.repository.findEndpoint(endpointId);
    const delivery = await this.repository.findDelivery(deliveryId);
    if (
      !endpoint ||
      !delivery ||
      endpoint.organizationId !== scope.organizationId ||
      delivery.endpointId !== endpoint.id
    )
      throw PublicProblemException.fileUnavailable();
    if (!endpoint.enabled)
      throw PublicProblemException.validation([
        {
          pointer: '#/path/endpointId',
          detail: 'Webhook Endpoint is disabled.',
        },
      ]);
    await this.repository.setDeliveryStatus(delivery.id, 'pending');
    await this.queue.enqueue(delivery.id);
    await this.auditEvents.record({
      action: 'organization.webhook-delivery.replay-requested',
      actor: { id: user.id, type: 'user' },
      context: { endpointId: endpoint.id },
      organizationId: scope.organizationId,
      target: { id: delivery.id, type: 'webhook-delivery' },
    });
    return delivery;
  }
  async attempts(
    user: AuthenticatedUser,
    organizationId: string,
    endpointId: string,
    deliveryId: string,
  ) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationWebhooksManage,
      targetOrganizationId: organizationId,
      user,
    });
    const delivery = await this.repository.findDelivery(deliveryId);
    if (
      !delivery ||
      delivery.organizationId !== scope.organizationId ||
      delivery.endpointId !== endpointId
    )
      throw PublicProblemException.fileUnavailable();
    return { items: await this.repository.listAttempts(deliveryId) };
  }
  sign(endpoint: WebhookEndpoint, delivery: WebhookDelivery) {
    return signWebhook(endpoint, delivery);
  }
  private toDto(endpoint: WebhookEndpoint) {
    const {
      secret: _secret,
      createdByUserId: _createdByUserId,
      ...dto
    } = endpoint;
    return { ...dto, createdAt: endpoint.createdAt.toISOString() };
  }
}
