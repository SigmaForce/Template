import { ApiProperty } from '@nestjs/swagger';

export class DependencyReadinessDto {
  @ApiProperty({ example: 'database' })
  name!: string;

  @ApiProperty()
  critical!: boolean;

  @ApiProperty({
    enum: ['up', 'down', 'configured', 'disabled', 'misconfigured'],
  })
  status!: 'up' | 'down' | 'configured' | 'disabled' | 'misconfigured';
}

export class ReadinessDto {
  @ApiProperty({ enum: ['api'] })
  service!: 'api';

  @ApiProperty({ enum: ['ready', 'degraded', 'unready'] })
  status!: 'ready' | 'degraded' | 'unready';

  @ApiProperty({ type: DependencyReadinessDto, isArray: true })
  dependencies!: DependencyReadinessDto[];
}
