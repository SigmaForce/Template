import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { ContractExamplesController } from './contract-examples/contract-examples.controller.js';

@Module({
  imports: [],
  controllers: [AppController, ContractExamplesController],
})
export class AppModule {}
