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
  allowedOrigins?: string[];
  readinessChecks?: ReadinessCheck[];
  logger?: JsonLogger;
}

type BodyParserApplication = INestApplication & {
  useBodyParser(type: 'json' | 'urlencoded', options: { limit: string }): void;
};

export function configureApi(
  app: INestApplication,
  {
    allowedOrigins = ['http://localhost:3000'],
    readinessChecks = [],
    logger,
  }: ConfigureApiOptions = {},
) {
  app.setGlobalPrefix('v1');
  const bodyParserApp = app as BodyParserApplication;
  bodyParserApp.useBodyParser('json', { limit: '32kb' });
  bodyParserApp.useBodyParser('urlencoded', { limit: '32kb' });
  app.use(
    (
      _request: object,
      response: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      response.setHeader(
        'content-security-policy',
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      );
      response.setHeader('referrer-policy', 'no-referrer');
      response.setHeader('strict-transport-security', 'max-age=31536000');
      response.setHeader('x-content-type-options', 'nosniff');
      response.setHeader('x-frame-options', 'DENY');
      next();
    },
  );
  app.enableCors({
    allowedHeaders: [
      'authorization',
      'content-type',
      'idempotency-key',
      'x-correlation-id',
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PATCH', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    origin: allowedOrigins,
  });
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
