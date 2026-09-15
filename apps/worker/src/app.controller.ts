import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  @Get()
  getHealth() {
    return {
      service: 'worker',
      status: 'healthy',
    } as const;
  }
}
