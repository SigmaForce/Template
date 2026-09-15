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
}
