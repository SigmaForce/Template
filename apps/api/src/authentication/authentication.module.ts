import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  type AuthenticationOptions,
  SessionTokenVerifier,
} from './authentication.js';
import { AuthenticationController } from './authentication.controller.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { RequestRateLimiter } from './request-rate-limiter.js';
import {
  AUTHENTICATION_OPTIONS,
  ClerkTokenVerifier,
} from './clerk-token-verifier.js';

@Module({})
export class AuthenticationModule {
  static register(options: AuthenticationOptions): DynamicModule {
    return {
      module: AuthenticationModule,
      controllers: [AuthenticationController],
      providers: [
        { provide: AUTHENTICATION_OPTIONS, useValue: options },
        ClerkTokenVerifier,
        {
          provide: SessionTokenVerifier,
          useExisting: ClerkTokenVerifier,
        },
        {
          provide: RequestRateLimiter,
          useValue: new RequestRateLimiter(options.rateLimit),
        },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
      ],
    };
  }
}
