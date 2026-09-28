import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditEventsService } from '../audit-events/audit-events.service.js';
import type { StripePlanMappings } from '../billing/subscription-projection.js';
import {
  SubscriptionAuthority,
  SubscriptionReconciliationService,
  type SubscriptionRepairRepository,
} from '../billing/subscription-reconciliation.js';
import { PublicProblemException } from '../http/problem-details.js';
import type { RequestRateLimitOptions } from '../authentication/authentication.js';
import { RequestRateLimiter } from '../authentication/request-rate-limiter.js';
import { OperatorAuthenticationGuard } from './operator-authentication.guard.js';
import { OperatorBillingController } from './operator-billing.controller.js';
import {
  OperatorSessionVerifier,
  type OperatorPermission,
} from './operator.js';

export interface OperatorsModuleOptions {
  authority: SubscriptionAuthority;
  planMappings: StripePlanMappings;
  projections: SubscriptionRepairRepository;
  rateLimit?: RequestRateLimitOptions;
  sessionVerifier: OperatorSessionVerifier;
}

@Module({})
export class OperatorsModule {
  static register(options: OperatorsModuleOptions): DynamicModule {
    return {
      module: OperatorsModule,
      controllers: [OperatorBillingController],
      providers: [
        {
          provide: OperatorSessionVerifier,
          useValue: options.sessionVerifier,
        },
        {
          provide: RequestRateLimiter,
          useValue: new RequestRateLimiter(options.rateLimit),
        },
        { provide: APP_GUARD, useClass: OperatorAuthenticationGuard },
        {
          provide: SubscriptionReconciliationService,
          inject: [OperatorSessionVerifier, AuditEventsService],
          useFactory: (
            sessions: OperatorSessionVerifier,
            auditEvents: AuditEventsService,
          ) =>
            new SubscriptionReconciliationService({
              audit: (event) => auditEvents.record({ ...event, context: {} }),
              authority: options.authority,
              authorize: async ({ action, credential, organizationId }) => {
                let operator;
                try {
                  operator = await sessions.verify(credential);
                } catch {
                  throw PublicProblemException.authenticationRequired();
                }
                const permission =
                  `billing:subscriptions:${action}` satisfies OperatorPermission;
                if (
                  !operator.permissions.includes(permission) ||
                  !operator.organizationIds.includes(organizationId)
                ) {
                  throw PublicProblemException.permissionDenied();
                }
                return { operatorId: operator.id };
              },
              planMappings: options.planMappings,
              projections: options.projections,
            }),
        },
      ],
    };
  }
}
