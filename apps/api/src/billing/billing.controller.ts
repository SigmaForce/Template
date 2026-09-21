import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
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
import { ProblemDetailsDto } from '../http/problem-details.js';
import { PlanCatalogDto, planCatalog } from './plan-catalog.js';
import { BillingService } from './billing.service.js';
import { SubscriptionDto } from './subscription.dto.js';

@ApiTags('billing')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/billing')
export class BillingController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly billing: BillingService,
  ) {}

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
