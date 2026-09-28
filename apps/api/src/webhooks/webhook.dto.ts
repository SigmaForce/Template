import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsString,
  IsUrl,
} from 'class-validator';

export const webhookEventTypes = [
  'organization.file.created',
  'organization.api-key.created',
] as const;

export class CreateWebhookEndpointDto {
  @ApiProperty({ example: 'https://hooks.example.test/events' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string;
  @ApiProperty({
    enum: webhookEventTypes,
    example: ['organization.file.created'],
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(webhookEventTypes, { each: true })
  events!: string[];
}
export class UpdateWebhookEndpointDto {
  @ApiProperty() @IsBoolean() enabled!: boolean;
}
export class WebhookEndpointDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ isArray: true }) events!: string[];
  @ApiProperty() enabled!: boolean;
  @ApiProperty() createdAt!: string;
}
export class IssuedWebhookEndpointDto {
  @ApiProperty({ type: WebhookEndpointDto }) endpoint!: WebhookEndpointDto;
  @ApiProperty() secret!: string;
}
export class WebhookEndpointListDto {
  @ApiProperty({ type: [WebhookEndpointDto] }) items!: WebhookEndpointDto[];
}
