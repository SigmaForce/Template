import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsString,
  Length,
} from 'class-validator';
import { Permission, type PermissionId } from '../authorization/permission.js';

// ponytail: read-only machine scopes; add mutations with API-Key audit actors.
export const apiKeyScopes = [
  Permission.organizationAuditEventsRead,
  Permission.organizationSettingsRead,
] as const;

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Reporting' })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ enum: apiKeyScopes, isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(apiKeyScopes, { each: true })
  scopes!: PermissionId[];
}

export class ApiKeyDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: apiKeyScopes, isArray: true })
  scopes!: PermissionId[];

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  expiresAt!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  revokedAt!: string | null;
}

export class IssuedApiKeyDto {
  @ApiProperty({ type: ApiKeyDto })
  apiKey!: ApiKeyDto;

  @ApiProperty()
  plaintext!: string;
}
