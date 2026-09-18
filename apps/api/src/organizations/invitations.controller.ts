import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
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
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import { ProblemDetailsDto } from '../http/problem-details.js';
import { AcceptedInvitationDto } from './organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('invitations')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post(':externalId/accept')
  @HttpCode(200)
  @ApiOperation({ operationId: 'acceptOrganizationInvitation' })
  @ApiOkResponse({ type: AcceptedInvitationDto })
  @ApiResponse({
    status: 409,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  accept(
    @CurrentUser() user: AuthenticatedUser,
    @Param('externalId') externalId: string,
  ) {
    return this.organizations.acceptInvitation(user, externalId);
  }

  @Get(':externalId/acceptance')
  @ApiOperation({ operationId: 'getAcceptedOrganizationInvitation' })
  @ApiOkResponse({ type: AcceptedInvitationDto })
  @ApiResponse({
    status: 409,
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  getAcceptance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('externalId') externalId: string,
  ) {
    return this.organizations.getAcceptedInvitation(user, externalId);
  }
}
