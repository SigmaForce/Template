import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Capability } from '../authorization/authorization.js';
import { Permission } from '../authorization/permission.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import {
  ProblemDetailsDto,
  PublicProblemException,
} from '../http/problem-details.js';
import { PlanCatalogDto, planCatalog } from './plan-catalog.js';
import { BillingService } from './billing.service.js';
import { SubscriptionDto } from './subscription.dto.js';
import {
  CheckoutSessionDto,
  CreateCheckoutSessionDto,
} from './checkout.dto.js';
import { CreatePortalSessionDto, PortalSessionDto } from './portal.dto.js';

@ApiTags('billing')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/billing')
export class BillingController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly billing: BillingService,
  ) {}

  @Post('portal-sessions')
  @ApiOperation({ operationId: 'createPortalSession' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiCreatedResponse({ type: PortalSessionDto })
  @ApiResponse({
    status: 400,
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
  @ApiResponse({
    status: 404,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  createPortalSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() input: CreatePortalSessionDto,
  ) {
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{8,64}$/.test(idempotencyKey)) {
      throw PublicProblemException.validation([
        {
          pointer: '#/headers/idempotency-key',
          detail: 'Idempotency-Key must contain 8 to 64 safe ASCII characters.',
        },
      ]);
    }
    return this.billing.createPortalSession(
      user,
      organizationId,
      idempotencyKey,
      input,
    );
  }

  @Post('checkout-sessions')
  @ApiOperation({ operationId: 'createCheckoutSession' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiCreatedResponse({ type: CheckoutSessionDto })
  @ApiResponse({
    status: 400,
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
  @ApiResponse({
    status: 409,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateCheckoutSessionDto,
  ) {
    return this.billing.createCheckoutSession(user, organizationId, input);
  }

  @Get('catalog')
  @ApiOperation({ operationId: 'getPlanCatalog' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: PlanCatalogDto })
  @ApiResponse({
    status: 403,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  async getCatalog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    await this.authorization.authorize({
      capability: Capability.billing,
      permission: Permission.billingManage,
      targetOrganizationId: organizationId,
      user,
    });

    return planCatalog;
  }

  @Get('subscription')
  @ApiOperation({ operationId: 'getSubscription' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: SubscriptionDto })
  @ApiResponse({
    status: 403,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  @ApiResponse({
    status: 404,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  getSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.billing.getSubscription(user, organizationId);
  }
}
