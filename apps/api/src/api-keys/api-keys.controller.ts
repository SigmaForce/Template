import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import {
  ApiKeyListDto,
  CreateApiKeyDto,
  IssuedApiKeyDto,
} from './api-key.dto.js';
import { ApiKeysService } from './api-keys.service.js';
import { ListApiKeysQuery } from './list-api-keys.query.js';

@ApiTags('api-keys')
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  @ApiOperation({ operationId: 'createOrganizationApiKey' })
  @ApiCreatedResponse({ type: IssuedApiKeyDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateApiKeyDto,
  ) {
    return this.apiKeys.create(user, organizationId, input);
  }

  @Get()
  @ApiOperation({ operationId: 'listOrganizationApiKeys' })
  @ApiOkResponse({ type: ApiKeyListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Query() query: ListApiKeysQuery,
  ) {
    return this.apiKeys.list(user, organizationId, query);
  }

  @Post(':apiKeyId/rotate')
  @ApiOperation({ operationId: 'rotateOrganizationApiKey' })
  @ApiCreatedResponse({ type: IssuedApiKeyDto })
  rotate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    return this.apiKeys.rotate(user, organizationId, apiKeyId);
  }

  @Delete(':apiKeyId')
  @HttpCode(204)
  @ApiOperation({ operationId: 'revokeOrganizationApiKey' })
  @ApiNoContentResponse()
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId') apiKeyId: string,
  ) {
    await this.apiKeys.revoke(user, organizationId, apiKeyId);
  }
}
