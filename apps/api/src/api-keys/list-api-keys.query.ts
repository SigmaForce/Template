import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListApiKeysQuery {
  @ApiPropertyOptional({
    default: 20,
    maximum: 100,
    minimum: 1,
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description: 'Opaque cursor returned by the previous page.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
