import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './authentication/authentication.js';

@ApiTags('Health')
@Public()
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
        status: { type: 'string', enum: ['healthy'] },
      },
    },
  })
  getHealth() {
    return {
      service: 'api',
      status: 'healthy',
    } as const;
  }
}
