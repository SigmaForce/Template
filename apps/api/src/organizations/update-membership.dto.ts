import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { OrganizationRole } from '../authorization/permission.js';

export class UpdateMembershipDto {
  static readonly validationRoot = '#/body';

  @ApiProperty({ enum: ['admin', 'member', 'owner'], required: false })
  @IsOptional()
  @IsIn(['admin', 'member', 'owner'])
  role?: OrganizationRole;

  @ApiProperty({ enum: ['active', 'suspended'], required: false })
  @IsOptional()
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
