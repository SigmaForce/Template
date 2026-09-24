import { HttpException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemValidationErrorDto {
  @ApiProperty({ example: 'limit must not be greater than 100' })
  detail!: string;

  @ApiProperty({ example: '#/query/limit' })
  pointer!: string;
}

export class ProblemDetailsDto {
  @ApiProperty({ example: 'urn:problem:next-nest-saas-starter:validation' })
  type!: string;

  @ApiProperty({ example: 'Request validation failed' })
  title!: string;

  @ApiProperty({ example: 400 })
  status!: number;

  @ApiProperty({ example: 'One or more request values are invalid.' })
  detail!: string;

  @ApiProperty({ example: 'urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6' })
  instance!: string;

  @ApiProperty({ example: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6' })
  correlationId!: string;

  @ApiPropertyOptional({ type: [ProblemValidationErrorDto] })
  errors?: ProblemValidationErrorDto[];
}

type PublicProblem = Pick<
  ProblemDetailsDto,
  'type' | 'title' | 'status' | 'detail'
> & {
  errors?: ProblemValidationErrorDto[];
};

export class PublicProblemException extends HttpException {
  constructor(readonly problem: PublicProblem) {
    super(problem.title, problem.status);
  }

  static validation(errors: ProblemValidationErrorDto[]) {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:validation',
      title: 'Request validation failed',
      status: 400,
      detail: 'One or more request values are invalid.',
      errors,
    });
  }

  static authenticationRequired() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:authentication-required',
      title: 'Authentication required',
      status: 401,
      detail: 'A valid session token is required.',
    });
  }

  static activeOrganizationRequired() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:active-organization-required',
      title: 'Active Organization required',
      status: 409,
      detail: 'Select an Active Organization and retry the request.',
    });
  }

  static permissionDenied() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:permission-denied',
      title: 'Permission denied',
      status: 403,
      detail: 'You do not have permission to perform this action.',
    });
  }

  static rateLimited() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:rate-limited',
      title: 'Too many requests',
      status: 429,
      detail: 'Retry after the indicated interval.',
    });
  }

  static invalidWebhookSignature() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:invalid-webhook-signature',
      title: 'Invalid webhook signature',
      status: 400,
      detail: 'The webhook signature could not be verified.',
    });
  }

  static subscriptionUnavailable() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:subscription-unavailable',
      title: 'Subscription unavailable',
      status: 404,
      detail: 'No projected Subscription is available for this Organization.',
    });
  }

  static billingPortalUnavailable() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:billing-portal-unavailable',
      title: 'Customer Portal unavailable',
      status: 404,
      detail: 'No projected Subscription can open Customer Portal.',
    });
  }

  static subscriptionAlreadyExists() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:subscription-already-exists',
      title: 'Subscription already exists',
      status: 409,
      detail: 'Manage the existing Organization Subscription instead.',
    });
  }

  static organizationSlugConflict() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:organization-slug-conflict',
      title: 'Organization slug is unavailable',
      status: 409,
      detail: 'Choose a different Organization slug.',
      errors: [
        {
          pointer: '#/body/slug',
          detail: 'Choose a different Organization slug.',
        },
      ],
    });
  }

  static idempotencyConflict() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:idempotency-conflict',
      title: 'Idempotency key conflict',
      status: 409,
      detail: 'This Idempotency-Key was already used with different input.',
    });
  }

  static organizationOnboardingInProgress() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:onboarding-in-progress',
      title: 'Organization onboarding is in progress',
      status: 409,
      detail: 'Retry the same request after the current operation completes.',
    });
  }

  static organizationAlreadyExists() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:organization-already-exists',
      title: 'Organization already exists',
      status: 409,
      detail: 'This User has already completed Organization onboarding.',
    });
  }

  static invitationUnavailable() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:invitation-unavailable',
      title: 'Invitation unavailable',
      status: 409,
      detail: 'This Invitation cannot be used in its current state.',
    });
  }

  static membershipUnavailable() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:membership-unavailable',
      title: 'Membership unavailable',
      status: 409,
      detail: 'This Membership cannot be changed in its current state.',
    });
  }

  static lastOwnerRequired() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:last-owner-required',
      title: 'An active Owner is required',
      status: 409,
      detail: 'Assign another active Owner before changing this Membership.',
    });
  }

  static seatAllowanceExceeded() {
    return new PublicProblemException({
      type: 'urn:problem:next-nest-saas-starter:seat-allowance-exceeded',
      title: 'Seat allowance exceeded',
      status: 409,
      detail: 'Suspend another Membership or select a Plan with more Seats.',
    });
  }
}
