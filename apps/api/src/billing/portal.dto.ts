import { ApiProperty } from '@nestjs/swagger';
import { IsUrl, MaxLength } from 'class-validator';

export class CreatePortalSessionDto {
  @ApiProperty({ example: 'https://app.example.com/organizations/northstar' })
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2_048)
  returnUrl!: string;
}

export class PortalSessionDto {
  @ApiProperty({ example: 'https://billing.stripe.com/p/session/test_example' })
  portalUrl!: string;
}
