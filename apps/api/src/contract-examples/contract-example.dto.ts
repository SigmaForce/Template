import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const uuidV7Pattern =
  '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

export class MoneyDto {
  @ApiProperty({
    description: 'Integer minor units encoded as a decimal string.',
    example: '4900',
    pattern: '^-?[0-9]+$',
  })
  amountMinor!: string;

  @ApiProperty({ example: 'BRL', pattern: '^[A-Z]{3}$' })
  currency!: string;
}

export class LocalBusinessTimeDto {
  @ApiProperty({
    example: '09:30:00',
    pattern: '^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d$',
  })
  localTime!: string;

  @ApiProperty({ example: 'America/Cuiaba' })
  timeZone!: string;
}

export class ContractExampleDto {
  @ApiProperty({
    description: 'Opaque public UUIDv7 identifier.',
    example: '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1001',
    format: 'uuid',
    pattern: uuidV7Pattern,
  })
  id!: string;

  @ApiProperty({ example: 'Foundation contract' })
  name!: string;

  @ApiProperty({ example: '2026-01-15T14:30:00.000Z', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: '2026-01-15', format: 'date' })
  businessDate!: string;

  @ApiProperty({ type: LocalBusinessTimeDto })
  localBusinessTime!: LocalBusinessTimeDto;

  @ApiProperty({ type: MoneyDto })
  price!: MoneyDto;

  @ApiProperty({
    description: 'Explicit null means the resource has not been retired.',
    example: null,
    format: 'date-time',
    nullable: true,
    type: String,
  })
  retiredAt!: string | null;

  @ApiPropertyOptional({
    description: 'An absent property means no summary was supplied.',
    example: 'Generated from the public OpenAPI document.',
  })
  summary?: string;
}

export class PageInfoDto {
  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Opaque cursor for the next page, or null at the end.',
    example: 'eyJ2IjoxLCJzY29wZSI6ImNvbnRyYWN0LWV4YW1wbGVzIn0',
    nullable: true,
    type: String,
  })
  nextCursor!: string | null;
}

export class ContractExamplePageDto {
  @ApiProperty({ type: [ContractExampleDto] })
  items!: ContractExampleDto[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}
