import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../authentication/authentication.js';
import { ProblemDetailsDto } from '../http/problem-details.js';
import { BillingService } from './billing.service.js';

@ApiTags('billing')
@ApiExtraModels(ProblemDetailsDto)
@Public()
@Controller('billing/stripe/webhooks')
export class StripeWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ operationId: 'receiveStripeWebhook' })
  @ApiOkResponse({ schema: { example: { received: true } } })
  @ApiResponse({
    status: 400,
    description: 'The Stripe signature is invalid.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  receive(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    return this.billing.receiveStripeEvent(request.rawBody, signature);
  }
}
