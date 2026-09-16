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
    const organizationClaim =
      payload.v === 2
        ? payload.o
          ? { id: payload.o.id, role: payload.o.rol, slug: payload.o.slg }
          : undefined
        : payload.org_id
          ? {
              id: payload.org_id,
              role: payload.org_role?.replace(/^org:/, ''),
              slug: payload.org_slug,
            }
          : undefined;
    const activeOrganization =
      organizationClaim?.id && organizationClaim.slug
        ? {
            id: organizationClaim.id,
            ...(organizationClaim.role ? { role: organizationClaim.role } : {}),
            slug: organizationClaim.slug,
          }
        : undefined;

    return {
      id: payload.sub,
      ...(activeOrganization ? { activeOrganization } : {}),
    };
  }
}
