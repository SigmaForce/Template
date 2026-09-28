import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
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
import { PublicProblemException } from '../http/problem-details.js';

function requireIdempotencyKey(value: string | undefined) {
  if (!value || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw PublicProblemException.validation([
      {
        detail: 'Idempotency-Key must contain 8 to 128 safe ASCII characters.',
        pointer: '#/headers/idempotency-key',
      },
    ]);
  }
  return value;
}

@ApiTags('api-keys')
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Post()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'createOrganizationApiKey' })
  @ApiCreatedResponse({ type: IssuedApiKeyDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateApiKeyDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.apiKeys.create(
      user,
      organizationId,
      input,
      requireIdempotencyKey(idempotencyKey),
    );
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
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({ operationId: 'rotateOrganizationApiKey' })
  @ApiCreatedResponse({ type: IssuedApiKeyDto })
  rotate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId', new ParseUUIDPipe({ version: '4' })) apiKeyId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.apiKeys.rotate(
      user,
      organizationId,
      apiKeyId,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Delete(':apiKeyId')
  @HttpCode(204)
  @ApiOperation({ operationId: 'revokeOrganizationApiKey' })
  @ApiNoContentResponse()
  async revoke(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('apiKeyId', new ParseUUIDPipe({ version: '4' })) apiKeyId: string,
  ) {
    await this.apiKeys.revoke(user, organizationId, apiKeyId);
  }
}
