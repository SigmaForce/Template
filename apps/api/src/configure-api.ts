import {
  type INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ProblemDetailsFilter } from './http/problem-details.filter.js';
import {
  PublicProblemException,
  type ProblemValidationErrorDto,
} from './http/problem-details.js';
import { exposeOpenApi } from './openapi.js';
import {
  ReadinessService,
  type ReadinessCheck,
} from '@saas/tooling-config/readiness';
import {
  correlationIdMiddleware,
  createRequestLoggingMiddleware,
} from '@saas/tooling-config/http';
import type { JsonLogger } from '@saas/tooling-config/logging';

function flattenValidationErrors(
  errors: ValidationError[],
  parent = validationRoot(errors),
): ProblemValidationErrorDto[] {
  return errors.flatMap((error) => {
    const pointer = `${parent}/${error.property}`;
    const ownErrors = Object.values(error.constraints ?? {}).map((detail) => ({
      pointer,
      detail,
    }));
    const childErrors = flattenValidationErrors(error.children ?? [], pointer);

    return [...ownErrors, ...childErrors];
  });
}

function validationRoot(errors: ValidationError[]) {
  const target = errors[0]?.target as
    { constructor?: { validationRoot?: string } } | undefined;
  return target?.constructor?.validationRoot ?? '#/query';
}

export interface ConfigureApiOptions {
  readinessChecks?: ReadinessCheck[];
  logger?: JsonLogger;
}

export function configureApi(
  app: INestApplication,
  { readinessChecks = [], logger }: ConfigureApiOptions = {},
) {
  app.setGlobalPrefix('v1');
  app.use(correlationIdMiddleware);
  if (logger) {
    app.useLogger(logger);
    app.use(createRequestLoggingMiddleware(logger));
  }
  app.get(ReadinessService).configure(readinessChecks);
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        PublicProblemException.validation(flattenValidationErrors(errors)),
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  exposeOpenApi(app);
}
