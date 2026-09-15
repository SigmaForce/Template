import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReadinessService } from '@saas/tooling-config/readiness';

@Controller('ready')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService<'worker'>) {}

  @Get()
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const report = await this.readiness.inspect();

    if (report.status === 'unready') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return report;
  }
}
