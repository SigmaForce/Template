import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReadinessDto } from './readiness.dto.js';
import { ReadinessService } from '@saas/tooling-config/readiness';
import { Public } from '../authentication/authentication.js';

@ApiTags('Health')
@Public()
@Controller('ready')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService<'api'>) {}

  @Get()
  @ApiOperation({ operationId: 'getReadiness' })
  @ApiOkResponse({ type: ReadinessDto })
  @ApiServiceUnavailableResponse({ type: ReadinessDto })
  async getReadiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessDto> {
    const report = await this.readiness.inspect();

    if (report.status === 'unready') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return report;
  }
}
