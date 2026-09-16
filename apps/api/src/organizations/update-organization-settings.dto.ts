import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  organizationLocales,
  organizationTimeZones,
} from './create-organization.dto.js';

export class UpdateOrganizationSettingsDto {
  static readonly validationRoot = '#/body';

  @ApiProperty({ enum: organizationLocales, example: 'pt-BR' })
  @IsIn(organizationLocales)
  locale!: (typeof organizationLocales)[number];

  @ApiProperty({ enum: organizationTimeZones, example: 'America/Cuiaba' })
  @IsIn(organizationTimeZones)
  timeZone!: (typeof organizationTimeZones)[number];
}
