import { ApiProperty } from '@nestjs/swagger';
import type { SubscriptionStatus } from './billing.js';
import type { PlanId } from './plan-catalog.js';

export class SubscriptionDto {
  @ApiProperty({ example: false })
  cancelAtPeriodEnd!: boolean;

  @ApiProperty({ example: 'sub_2abc' })
  providerSubscriptionId!: string;

  @ApiProperty({ enum: ['launch', 'scale'], example: 'launch' })
  planId!: PlanId;

  @ApiProperty({ example: 1 })
  planVersion!: number;

  @ApiProperty({
    example: '2026-09-20T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
    type: String,
  })
  pastDueAt!: string | null;

  @ApiProperty({ enum: ['launch', 'scale'], example: 'launch', nullable: true })
  scheduledPlanId!: PlanId | null;

  @ApiProperty({
    enum: [
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'paused',
      'trialing',
      'unpaid',
    ],
    example: 'active',
  })
  status!: SubscriptionStatus;

  @ApiProperty({ example: '2026-10-20T12:00:00.000Z', format: 'date-time' })
  currentPeriodEndsAt!: string;
}
