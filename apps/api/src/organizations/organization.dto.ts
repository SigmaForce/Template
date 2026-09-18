import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission, type PermissionId } from '../authorization/permission.js';
import { PageInfoDto } from '../http/page-info.dto.js';

export class OrganizationDto {
  @ApiProperty({
    example: 'billing@northstar.test',
    format: 'email',
    nullable: true,
    type: String,
  })
  billingContactEmail!: string | null;

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

  @ApiProperty({ enum: ['admin', 'member', 'owner'] })
  role!: 'admin' | 'member' | 'owner';

  @ApiProperty({ enum: Object.values(Permission), isArray: true })
  permissions!: PermissionId[];
}

export class OrganizationSlugResolutionDto {
  @ApiProperty({ example: 'org_2abc' })
  id!: string;

  @ApiProperty({ example: 'northstar-labs' })
  slug!: string;
}

export class MembershipDto {
  @ApiProperty({ example: 'user_2abc' })
  userId!: string;

  @ApiProperty({ enum: ['admin', 'member', 'owner'] })
  role!: 'admin' | 'member' | 'owner';

  @ApiProperty({ enum: ['active', 'removed', 'suspended'] })
  status!: 'active' | 'removed' | 'suspended';
}

export class MembershipListDto {
  @ApiProperty({ type: [MembershipDto] })
  items!: MembershipDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
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
