import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationDto {
  @ApiProperty({ example: 'org_2abc' })
  id!: string;

  @ApiProperty({ example: 'Northstar Labs' })
  name!: string;

  @ApiProperty({ example: 'northstar-labs' })
  slug!: string;

  @ApiProperty({ example: 'pt-BR' })
  locale!: string;

  @ApiProperty({ example: 'America/Cuiaba' })
  timeZone!: string;
}

export class OwnerMembershipDto {
  @ApiProperty({ enum: ['owner'], example: 'owner' })
  role!: 'owner';
}

export class OrganizationOnboardingResultDto {
  @ApiProperty({ type: OrganizationDto })
  organization!: OrganizationDto;

  @ApiProperty({ type: OwnerMembershipDto })
  membership!: OwnerMembershipDto;
}

export class OrganizationOnboardingStateDto {
  @ApiProperty({ enum: ['required', 'complete'] })
  status!: 'required' | 'complete';

  @ApiPropertyOptional({ type: OrganizationDto })
  organization?: OrganizationDto;

  @ApiPropertyOptional({ type: OwnerMembershipDto })
  membership?: OwnerMembershipDto;
}

export class ActiveOrganizationDto {
  @ApiProperty({ example: 'org_2abc' })
  id!: string;

  @ApiProperty({ example: 'northstar-labs' })
  slug!: string;
}
