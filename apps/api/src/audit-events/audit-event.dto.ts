import { ApiProperty } from '@nestjs/swagger';
import { PageInfoDto } from '../http/page-info.dto.js';
import {
  auditActions,
  auditTargetTypes,
  type AuditAction,
  type AuditTarget,
} from './audit-event.js';

class AuditActorDto {
  @ApiProperty({ example: 'user_2abc' })
  id!: string;

  @ApiProperty({ enum: ['operator', 'user'] })
  type!: 'operator' | 'user';
}

class AuditTargetDto {
  @ApiProperty({ example: 'user_3def' })
  id!: string;

  @ApiProperty({ enum: auditTargetTypes, example: 'membership' })
  type!: AuditTarget['type'];
}

export class AuditEventDto {
  @ApiProperty({
    enum: auditActions,
    example: 'organization.membership.update-requested',
  })
  action!: AuditAction;

  @ApiProperty({ type: AuditActorDto })
  actor!: AuditActorDto;

  @ApiProperty({ additionalProperties: true, type: 'object' })
  context!: Record<string, unknown>;

  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  occurredAt!: string;

  @ApiProperty({ type: AuditTargetDto })
  target!: AuditTargetDto;
}

export class AuditEventListDto {
  @ApiProperty({ type: [AuditEventDto] })
  items!: AuditEventDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}
