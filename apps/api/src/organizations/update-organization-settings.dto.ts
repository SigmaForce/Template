import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, ValidateIf } from 'class-validator';
import { CreateOrganizationDto } from './create-organization.dto.js';

export class UpdateOrganizationSettingsDto extends PartialType(
  CreateOrganizationDto,
) {
  static readonly validationRoot = '#/body';

  @ApiPropertyOptional({
    example: 'billing@northstar.test',
    format: 'email',
    nullable: true,
    type: String,
  })
  @ValidateIf((_, value: unknown) => value !== undefined && value !== null)
  @IsEmail()
  billingContactEmail?: string | null;
}
