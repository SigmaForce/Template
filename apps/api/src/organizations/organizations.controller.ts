import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import { CreateOrganizationDto } from './create-organization.dto.js';
import {
  ActiveOrganizationDto,
  OrganizationDto,
  OrganizationOnboardingResultDto,
  OrganizationOnboardingStateDto,
} from './organization.dto.js';
import { OrganizationsService } from './organizations.service.js';
import {
  ProblemDetailsDto,
  PublicProblemException,
} from '../http/problem-details.js';
import { UpdateOrganizationSettingsDto } from './update-organization-settings.dto.js';

@ApiTags('organizations')
@ApiBearerAuth('clerk-session')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('active')
  @ApiOperation({ operationId: 'getActiveOrganization' })
  @ApiOkResponse({ type: ActiveOrganizationDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  getActiveOrganization(@CurrentUser() user: AuthenticatedUser) {
    return this.organizations.getActiveOrganization(user);
  }

  @Patch(':organizationId/settings')
  @ApiOperation({ operationId: 'updateOrganizationSettings' })
  @ApiParam({ name: 'organizationId', example: 'org_2abc' })
  @ApiOkResponse({ type: OrganizationDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: UpdateOrganizationSettingsDto,
  ) {
    return this.organizations.updateSettings(user, organizationId, input);
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
