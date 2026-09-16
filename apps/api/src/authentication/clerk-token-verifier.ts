import { verifyToken } from '@clerk/backend';
import { Inject, Injectable } from '@nestjs/common';
import {
  type AuthenticatedUser,
  type AuthenticationOptions,
  SessionTokenVerifier,
} from './authentication.js';

export const AUTHENTICATION_OPTIONS = Symbol('authentication-options');

@Injectable()
export class ClerkTokenVerifier extends SessionTokenVerifier {
  constructor(
    @Inject(AUTHENTICATION_OPTIONS)
    private readonly options: AuthenticationOptions,
  ) {
    super();
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    const payload = await verifyToken(token, this.options);

    return { id: payload.sub };
  }
}
