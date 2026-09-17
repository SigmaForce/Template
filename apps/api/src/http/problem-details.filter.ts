import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { getResponseCorrelationId } from '@saas/tooling-config/http';
import { PublicProblemException } from './problem-details.js';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const correlationId = getResponseCorrelationId(response);
    const publicProblem =
      exception instanceof PublicProblemException
        ? exception.problem
        : this.toGenericProblem(exception);

    response
      .status(publicProblem.status)
      .type('application/problem+json')
      .json({
        ...publicProblem,
        instance: `urn:uuid:${randomUUID()}`,
        correlationId,
      });
  }

  private toGenericProblem(exception: unknown) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : (this.statusFromHttpMiddleware(exception) ??
          HttpStatus.INTERNAL_SERVER_ERROR);

    if (status === HttpStatus.NOT_FOUND) {
      return {
        type: 'urn:problem:next-nest-saas-starter:not-found',
        title: 'Resource not found',
        status,
        detail: 'The requested resource was not found.',
      };
    }

    return {
      type: 'urn:problem:next-nest-saas-starter:request-failed',
      title:
        status >= 500
          ? 'Unexpected server error'
          : 'Request could not be processed',
      status,
      detail:
        status >= 500
          ? 'An unexpected error occurred.'
          : 'The request could not be processed.',
    };
  }

  private statusFromHttpMiddleware(exception: unknown) {
    if (
      typeof exception !== 'object' ||
      exception === null ||
      !('status' in exception) ||
      typeof exception.status !== 'number' ||
      exception.status < 400 ||
      exception.status > 599
    ) {
      return undefined;
    }
    return exception.status;
  }
}
