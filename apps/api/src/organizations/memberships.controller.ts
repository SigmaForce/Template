import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
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
import { MembershipDto, MembershipListDto } from './organization.dto.js';
import { ListMembershipsQuery } from './list-memberships.query.js';
import { MembershipsService } from './memberships.service.js';
import { UpdateMembershipDto } from './update-membership.dto.js';

const problemContent = {
  'application/problem+json': {
    schema: { $ref: getSchemaPath(ProblemDetailsDto) },
  },
};

@ApiTags('memberships')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  @ApiOperation({ operationId: 'listOrganizationMemberships' })
  @ApiOkResponse({ type: MembershipListDto })
  @ApiResponse({ status: 400, content: problemContent })
  @ApiResponse({ status: 403, content: problemContent })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Query() query: ListMembershipsQuery,
  ) {
    return this.memberships.list(user, organizationId, query);
  }

  @Patch(':userId')
  @ApiOperation({ operationId: 'updateOrganizationMembership' })
  @ApiOkResponse({ type: MembershipDto })
  @ApiResponse({ status: 400, content: problemContent })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() input: UpdateMembershipDto,
  ) {
    return this.memberships.update(user, organizationId, userId, input);
  }

  @Delete(':userId')
  @ApiOperation({ operationId: 'removeOrganizationMembership' })
  @ApiOkResponse({ type: MembershipDto })
  @ApiResponse({ status: 403, content: problemContent })
  @ApiResponse({ status: 409, content: problemContent })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.memberships.remove(user, organizationId, userId);
  }
}
