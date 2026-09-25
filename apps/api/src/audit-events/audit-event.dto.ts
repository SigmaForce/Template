import { ApiProperty } from '@nestjs/swagger';

class AuditActorDto {
  @ApiProperty({ example: 'user_2abc' })
  id!: string;

  @ApiProperty({ enum: ['operator', 'user'] })
  type!: 'operator' | 'user';
}

class AuditTargetDto {
  @ApiProperty({ example: 'user_3def' })
  id!: string;

  @ApiProperty({ example: 'membership' })
  type!: string;
}

export class AuditEventDto {
  @ApiProperty({ example: 'organization.membership.updated' })
  action!: string;

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
}
