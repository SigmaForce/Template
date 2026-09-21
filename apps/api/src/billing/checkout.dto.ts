import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUrl, MaxLength } from 'class-validator';
import { planIds, type PlanId } from './plan-catalog.js';

export class CreateCheckoutSessionDto {
  @ApiProperty({ enum: planIds, example: 'launch' })
  @IsIn(planIds)
  planId!: PlanId;

  @ApiProperty({ example: 'https://app.example.com/settings/billing/success' })
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2_048)
  successUrl!: string;

  @ApiProperty({ example: 'https://app.example.com/settings/billing' })
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2_048)
  cancelUrl!: string;
}

export class CheckoutSessionDto {
  @ApiProperty({ example: 'https://checkout.stripe.com/c/pay/cs_test_example' })
  checkoutUrl!: string;
}
