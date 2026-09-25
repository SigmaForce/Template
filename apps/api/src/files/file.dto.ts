import { ApiProperty } from '@nestjs/swagger';

export class FileDto {
  @ApiProperty({ example: 'application/pdf' })
  contentType!: string;

  @ApiProperty({ example: '2026-09-24T12:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: 'd4387e49-1d96-4a25-885c-5609ea8d19bb' })
  id!: string;

  @ApiProperty({ example: 'quarterly-report.pdf' })
  name!: string;

  @ApiProperty({ example: 2048 })
  size!: number;
}

export class FileListDto {
  @ApiProperty({ type: [FileDto] })
  items!: FileDto[];
}

export class FileDownloadDto {
  @ApiProperty({ example: '2026-09-24T12:01:00.000Z' })
  expiresAt!: string;

  @ApiProperty({ example: 'https://bucket.example/file?signature=short-lived' })
  url!: string;
}
