import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../authentication/authentication.js';
import {
  CreateWebhookEndpointDto,
  IssuedWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  WebhookEndpointDto,
  WebhookEndpointListDto,
} from './webhook.dto.js';
import { WebhooksService } from './webhooks.service.js';

@ApiTags('webhooks')
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/webhook-endpoints')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}
  @Post() @ApiCreatedResponse({ type: IssuedWebhookEndpointDto }) create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateWebhookEndpointDto,
  ) {
    return this.webhooks.create(user, organizationId, input);
  }
  @Get() @ApiOkResponse({ type: WebhookEndpointListDto }) list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.webhooks.list(user, organizationId);
  }
  @Patch(':endpointId') @ApiOkResponse({ type: WebhookEndpointDto }) update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('endpointId') endpointId: string,
    @Body() input: UpdateWebhookEndpointDto,
  ) {
    return this.webhooks.update(
      user,
      organizationId,
      endpointId,
      input.enabled,
    );
  }
  @Post(':endpointId/deliveries/:deliveryId/replay') replay(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('endpointId') endpointId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooks.replay(user, organizationId, endpointId, deliveryId);
  }
  @Get(':endpointId/deliveries/:deliveryId/attempts') attempts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('endpointId') endpointId: string,
    @Param('deliveryId') deliveryId: string,
  ) {
    return this.webhooks.attempts(user, organizationId, endpointId, deliveryId);
  }
}
