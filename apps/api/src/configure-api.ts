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

function flattenValidationErrors(
  errors: ValidationError[],
  parent = '#/query',
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

export function configureApi(app: INestApplication) {
  app.setGlobalPrefix('v1');
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
