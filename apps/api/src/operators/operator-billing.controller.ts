import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SubscriptionReconciliationService,
  type ReconciliationDifference,
  type SubscriptionReconciliationStatus,
} from '../billing/subscription-reconciliation.js';
import { ProblemDetailsDto } from '../http/problem-details.js';
import { CurrentOperatorCredential, OperatorRoute } from './operator.js';

class SubscriptionReconciliationDto {
  @ApiProperty({
    enum: [
      'cancelAtPeriodEnd',
      'currentPeriodEndsAt',
      'pastDueAt',
      'planId',
      'planVersion',
      'providerCustomerId',
      'providerSubscriptionId',
      'scheduledPlanId',
      'status',
    ],
    isArray: true,
  })
  differences!: ReconciliationDifference[];

  @ApiProperty({ example: 'org_2abc' })
  organizationId!: string;

  @ApiProperty({ example: 'sub_2abc' })
  providerSubscriptionId!: string;

  @ApiProperty({
    enum: ['drifted', 'in-sync', 'missing-authority', 'missing-local'],
  })
  status!: SubscriptionReconciliationStatus;
}

@OperatorRoute()
@ApiTags('Operator billing')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('operator-session')
@Controller(
  'internal/organizations/:organizationId/billing/subscriptions/:providerSubscriptionId',
)
export class OperatorBillingController {
  constructor(
    private readonly reconciliation: SubscriptionReconciliationService,
  ) {}

  @Get('reconciliation')
  @ApiOperation({ operationId: 'reconcileOperatorSubscription' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiParam({ name: 'providerSubscriptionId', example: 'sub_2abc' })
  @ApiOkResponse({ type: SubscriptionReconciliationDto })
  @ApiResponse({
    status: 401,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  @ApiResponse({
    status: 403,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  reconcile(
    @CurrentOperatorCredential() credential: string,
    @Param('organizationId') organizationId: string,
    @Param('providerSubscriptionId') providerSubscriptionId: string,
  ) {
    return this.reconciliation.reconcile({
      credential,
      organizationId,
      providerSubscriptionId,
    });
  }

  @Post('repair')
  @HttpCode(200)
  @ApiOperation({ operationId: 'repairOperatorSubscription' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiParam({ name: 'providerSubscriptionId', example: 'sub_2abc' })
  @ApiOkResponse({ type: SubscriptionReconciliationDto })
  @ApiResponse({
    status: 401,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  @ApiResponse({
    status: 403,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  repair(
    @CurrentOperatorCredential() credential: string,
    @Param('organizationId') organizationId: string,
    @Param('providerSubscriptionId') providerSubscriptionId: string,
  ) {
    return this.reconciliation.repair({
      credential,
      organizationId,
      providerSubscriptionId,
    });
  }
}
