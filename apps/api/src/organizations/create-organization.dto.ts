import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotIn, IsString, Length, Matches } from 'class-validator';

export const organizationLocales = ['en-US', 'pt-BR'] as const;
export const organizationTimeZones = [
  'America/Cuiaba',
  'America/Sao_Paulo',
  'UTC',
] as const;
export const reservedOrganizationSlugs = [
  'admin',
  'api',
  'billing',
  'organizations',
  'settings',
  'sign-in',
  'sign-up',
] as const;

export class CreateOrganizationDto {
  static readonly validationRoot = '#/body';

  @ApiProperty({ example: 'Northstar Labs', minLength: 2, maxLength: 100 })
  @IsString()
  @Length(2, 100)
  name!: string;

  @ApiProperty({ example: 'northstar-labs', minLength: 3, maxLength: 48 })
  @IsString()
  @Length(3, 48)
  @IsNotIn(reservedOrganizationSlugs, { message: 'slug is reserved' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters or numbers separated by single hyphens',
  })
  slug!: string;

  @ApiProperty({ enum: organizationLocales, example: 'pt-BR' })
  @IsIn(organizationLocales)
  locale!: (typeof organizationLocales)[number];

  @ApiProperty({ enum: organizationTimeZones, example: 'America/Cuiaba' })
  @IsIn(organizationTimeZones)
  timeZone!: (typeof organizationTimeZones)[number];
}
