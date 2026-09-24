import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import { CreateOrganizationDto } from './create-organization.dto.js';
import {
  ActiveOrganizationDto,
  OrganizationDto,
  OrganizationInvitationDto,
  OrganizationInvitationListDto,
  OrganizationOnboardingResultDto,
  OrganizationOnboardingStateDto,
  OrganizationSlugResolutionDto,
} from './organization.dto.js';
import { OrganizationsService } from './organizations.service.js';
import {
  ProblemDetailsDto,
  PublicProblemException,
} from '../http/problem-details.js';
import { UpdateOrganizationSettingsDto } from './update-organization-settings.dto.js';
import { CreateInvitationDto } from './create-invitation.dto.js';

const problemContent = {
  'application/problem+json': {
    schema: { $ref: getSchemaPath(ProblemDetailsDto) },
  },
};

@ApiTags('organizations')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('active')
  @ApiOperation({ operationId: 'getActiveOrganization' })
  @ApiOkResponse({ type: ActiveOrganizationDto })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  getActiveOrganization(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getActiveOrganization(user);
  }

  @Patch(':organizationId/settings')
  @ApiOperation({ operationId: 'updateOrganizationSettings' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: OrganizationDto })
  @ApiResponse({ status: 409, content: problemContent })
  @ApiResponse({
    status: 403,
    description: 'The operation is outside the granted Organization policy.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: UpdateOrganizationSettingsDto,
  ) {
    return this.organizations.updateSettings(user, organizationId, input);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ operationId: 'resolveOrganizationSlug' })
  @ApiParam({ name: 'slug', example: 'northstar-labs' })
  @ApiOkResponse({ type: OrganizationSlugResolutionDto })
  @ApiResponse({ status: 403, content: problemContent })
  resolveSlug(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug') slug: string,
  ) {
    return this.organizations.resolveSlug(user, slug);
  }

  @Post(':organizationId/invitations')
  @ApiOperation({ operationId: 'createOrganizationInvitation' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiCreatedResponse({ type: OrganizationInvitationDto })
  @ApiResponse({ status: 400, content: problemContent })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  createInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateInvitationDto,
  ) {
    return this.organizations.createInvitation(user, organizationId, input);
  }

  @Get(':organizationId/invitations')
  @ApiOperation({ operationId: 'listOrganizationInvitations' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: OrganizationInvitationListDto })
  @ApiResponse({ status: 403, content: problemContent })
  listInvitations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.listInvitations(user, organizationId);
  }

  @Delete(':organizationId/invitations/:invitationId')
  @ApiOperation({ operationId: 'revokeOrganizationInvitation' })
  @ApiOkResponse({ type: OrganizationInvitationDto })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  revokeInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizations.revokeInvitation(
      user,
      organizationId,
      invitationId,
    );
  }

  @Post(':organizationId/invitations/:invitationId/resend')
  @HttpCode(200)
  @ApiOperation({ operationId: 'resendOrganizationInvitation' })
  @ApiOkResponse({ type: OrganizationInvitationDto })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  resendInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizations.resendInvitation(
      user,
      organizationId,
      invitationId,
    );
  }

  @Get(':organizationId/settings')
  @ApiOperation({ operationId: 'getOrganizationSettings' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: OrganizationDto })
  @ApiResponse({
    status: 403,
    description: 'The operation is outside the granted Organization policy.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  getSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.getSettings(user, organizationId);
  }

  @Get(':organizationId/export')
  @ApiOperation({ operationId: 'exportOrganizationData' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: OrganizationDto })
  @ApiResponse({ status: 403, content: problemContent })
  exportData(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.exportData(user, organizationId);
  }

  @Post()
  @ApiOperation({ operationId: 'createFirstOrganization' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: OrganizationOnboardingResultDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() input: CreateOrganizationDto,
  ) {
    if (!idempotencyKey || !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
      throw PublicProblemException.validation([
        {
          pointer: '#/headers/idempotency-key',
          detail:
            'Idempotency-Key must contain 8 to 128 safe ASCII characters.',
        },
      ]);
    }

    return this.organizations.createFirstOrganization(
      user,
      idempotencyKey,
      input,
    );
  }

  @Get('onboarding')
  @ApiOperation({ operationId: 'getOrganizationOnboarding' })
  @ApiOkResponse({ type: OrganizationOnboardingStateDto })
  getOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getOnboarding(user);
  }
}
