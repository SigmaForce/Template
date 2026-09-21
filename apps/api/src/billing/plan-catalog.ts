import { ApiProperty } from '@nestjs/swagger';
import {
  Capability,
  type CapabilityId,
} from '../authorization/authorization.js';

export const planIds = ['launch', 'scale'] as const;
export type PlanId = (typeof planIds)[number];

export class CapabilityDto {
  @ApiProperty({ enum: Object.values(Capability), example: Capability.billing })
  id!: CapabilityId;

  @ApiProperty({ example: 'Billing' })
  name!: string;

  @ApiProperty({ example: 'View and manage the Organization Plan.' })
  description!: string;
}

export class PlanDto {
  @ApiProperty({ example: 'launch' })
  id!: PlanId;

  @ApiProperty({ example: 'Launch' })
  name!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  version!: number;

  @ApiProperty({ example: 5, minimum: 1 })
  seatAllowance!: number;

  @ApiProperty({ enum: Object.values(Capability), isArray: true })
  capabilities!: CapabilityId[];
}

export class PlanCatalogDto {
  @ApiProperty({ example: '2026-09-21' })
  version!: string;

  @ApiProperty({ type: [CapabilityDto] })
  capabilities!: CapabilityDto[];

  @ApiProperty({ type: [PlanDto] })
  plans!: PlanDto[];
}

const includedCapabilities = [
  Capability.billing,
  Capability.organizationMemberships,
  Capability.organizationSettings,
] as const;

export const planCatalog = {
  version: '2026-09-21',
  capabilities: [
    {
      id: Capability.billing,
      name: 'Billing',
      description: 'View and manage the Organization Plan.',
    },
    {
      id: Capability.organizationMemberships,
      name: 'Organization Memberships',
      description: 'Invite and manage Organization Memberships.',
    },
    {
      id: Capability.organizationSettings,
      name: 'Organization Settings',
      description: 'View and manage Organization settings.',
    },
  ],
  plans: [
    {
      id: 'launch',
      name: 'Launch',
      version: 1,
      seatAllowance: 5,
      capabilities: includedCapabilities,
    },
    {
      id: 'scale',
      name: 'Scale',
      version: 1,
      seatAllowance: 25,
      capabilities: includedCapabilities,
    },
  ],
} as const;
