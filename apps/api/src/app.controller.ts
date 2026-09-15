import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class AppController {
  @Get()
  @ApiOperation({ operationId: 'getHealth' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['service', 'status'],
      properties: {
        service: { type: 'string', enum: ['api'] },
        status: { type: 'string', enum: ['ok'] },
      },
    },
  })
  getHealth() {
    return {
      service: 'api',
      status: 'ok',
    } as const;
  }
}
