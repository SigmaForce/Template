import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission, type PermissionId } from '../authorization/permission.js';

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

  @ApiProperty({ enum: Object.values(Permission), isArray: true })
  permissions!: PermissionId[];
}

export class OrganizationInvitationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'org_2abc' })
  organizationId!: string;

  @ApiProperty({ example: 'new.user@example.com' })
  emailAddress!: string;

  @ApiProperty({ enum: ['admin', 'member', 'owner'] })
  role!: 'admin' | 'member' | 'owner';

  @ApiProperty({ enum: ['accepted', 'expired', 'pending', 'revoked'] })
  status!: 'accepted' | 'expired' | 'pending' | 'revoked';

  @ApiProperty({ example: '2026-09-23T18:30:00.000Z' })
  expiresAt!: string;
}

export class OrganizationInvitationListDto {
  @ApiProperty({ type: [OrganizationInvitationDto] })
  items!: OrganizationInvitationDto[];
}

class AcceptedInvitationOrganizationDto {
  @ApiProperty({ example: 'org_2abc' })
  id!: string;

  @ApiProperty({ example: 'northstar-labs' })
  slug!: string;
}

class AcceptedInvitationMembershipDto {
  @ApiProperty({ enum: ['admin', 'member', 'owner'] })
  role!: 'admin' | 'member' | 'owner';
}

export class AcceptedInvitationDto {
  @ApiProperty({ type: AcceptedInvitationOrganizationDto })
  organization!: AcceptedInvitationOrganizationDto;

  @ApiProperty({ type: AcceptedInvitationMembershipDto })
  membership!: AcceptedInvitationMembershipDto;
}
