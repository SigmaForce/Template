import { type DynamicModule, Module } from '@nestjs/common';
import { NotificationQueue, NotificationRepository } from './notification.js';
import { NotificationsService } from './notifications.service.js';
export interface NotificationsModuleOptions {
  repository: NotificationRepository;
  queue: NotificationQueue;
}
@Module({})
export class NotificationsModule {
  static register(options: NotificationsModuleOptions): DynamicModule {
    return {
      module: NotificationsModule,
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: options.repository },
        { provide: NotificationQueue, useValue: options.queue },
      ],
      exports: [NotificationsService],
    };
  }
}
