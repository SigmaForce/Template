import { ApiProperty } from '@nestjs/swagger';

export class PageInfoDto {
  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({
    description: 'Opaque cursor for the next page, or null at the end.',
    example: 'eyJ2IjoxLCJzY29wZSI6ImNvbGxlY3Rpb24ifQ',
    nullable: true,
    type: String,
  })
  nextCursor!: string | null;
}
