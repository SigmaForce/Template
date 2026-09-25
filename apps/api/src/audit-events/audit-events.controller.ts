import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CurrentPrincipal,
  type AuthenticatedPrincipal,
} from '../authentication/authentication.js';
import { ProblemDetailsDto } from '../http/problem-details.js';
import { AuditEventListDto } from './audit-event.dto.js';
import { AuditEventsService } from './audit-events.service.js';
import { ListAuditEventsQuery } from './list-audit-events.query.js';

@ApiTags('audit-events')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/audit-events')
export class AuditEventsController {
  constructor(private readonly auditEvents: AuditEventsService) {}

  @Get()
  @ApiOperation({ operationId: 'listOrganizationAuditEvents' })
  @ApiOkResponse({ type: AuditEventListDto })
  @ApiResponse({
    status: 403,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  list(
    @CurrentPrincipal() user: AuthenticatedPrincipal,
    @Param('organizationId') organizationId: string,
    @Query() query: ListAuditEventsQuery,
  ) {
    return this.auditEvents.list(user, organizationId, query);
  }
}
