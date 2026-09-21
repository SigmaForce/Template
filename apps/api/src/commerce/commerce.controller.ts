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
import { PlanCatalog, PlanCatalogDto } from './plan-catalog.js';

@ApiTags('commerce')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/billing')
export class CommerceController {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly plans: PlanCatalog,
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

    return this.plans.getPublicCatalog();
  }
}
