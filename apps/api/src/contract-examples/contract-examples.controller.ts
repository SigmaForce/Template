import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ProblemDetailsDto,
  PublicProblemException,
} from '../http/problem-details.js';
import {
  ContractExampleDto,
  ContractExamplePageDto,
} from './contract-example.dto.js';
import { ListContractExamplesQuery } from './list-contract-examples.query.js';

const cursorScope = 'public-contract-examples';
const cursorSort = 'createdAt,id';

const examples: ContractExampleDto[] = [
  {
    id: '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1001',
    name: 'Foundation contract',
    createdAt: '2026-01-15T14:30:00.000Z',
    businessDate: '2026-01-15',
    localBusinessTime: { localTime: '09:30:00', timeZone: 'America/Cuiaba' },
    price: { amountMinor: '4900', currency: 'BRL' },
    retiredAt: null,
  },
  {
    id: '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1002',
    name: 'Generated API client',
    createdAt: '2026-01-16T14:30:00.000Z',
    businessDate: '2026-01-16',
    localBusinessTime: { localTime: '10:00:00', timeZone: 'America/Cuiaba' },
    price: { amountMinor: '9900', currency: 'BRL' },
    retiredAt: null,
    summary: 'Generated from the public OpenAPI document.',
  },
  {
    id: '018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1003',
    name: 'Problem Details errors',
    createdAt: '2026-01-17T14:30:00.000Z',
    businessDate: '2026-01-17',
    localBusinessTime: { localTime: '08:15:00', timeZone: 'America/New_York' },
    price: { amountMinor: '2500', currency: 'USD' },
    retiredAt: '2026-02-01T12:00:00.000Z',
  },
];

type CursorPayload = {
  currency: string | null;
  lastId: string;
  scope: string;
  sort: string;
  version: number;
};

function encodeCursor(lastId: string, currency?: string) {
  const payload: CursorPayload = {
    currency: currency ?? null,
    lastId,
    scope: cursorScope,
    sort: cursorSort,
    version: 1,
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(cursor: string, currency?: string): CursorPayload {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('version' in payload) ||
      payload.version !== 1 ||
      !('scope' in payload) ||
      payload.scope !== cursorScope ||
      !('sort' in payload) ||
      payload.sort !== cursorSort ||
      !('currency' in payload) ||
      payload.currency !== (currency ?? null) ||
      !('lastId' in payload) ||
      typeof payload.lastId !== 'string'
    ) {
      throw new Error('Cursor payload does not match this collection.');
    }

    return {
      version: 1,
      scope: cursorScope,
      sort: cursorSort,
      currency: currency ?? null,
      lastId: payload.lastId,
    };
  } catch {
    throw PublicProblemException.validation([
      {
        pointer: '#/query/cursor',
        detail: 'cursor is invalid for the requested collection and filters',
      },
    ]);
  }
}

@ApiTags('Contract examples')
@ApiExtraModels(ProblemDetailsDto)
@Controller('contract-examples')
export class ContractExamplesController {
  @Get()
  @ApiOperation({ operationId: 'listContractExamples' })
  @ApiOkResponse({ type: ContractExamplePageDto })
  @ApiResponse({
    status: 400,
    description: 'The pagination request is invalid.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  list(@Query() query: ListContractExamplesQuery): ContractExamplePageDto {
    const filteredExamples = query.currency
      ? examples.filter((example) => example.price.currency === query.currency)
      : examples;
    const cursor = query.cursor
      ? decodeCursor(query.cursor, query.currency)
      : undefined;
    const cursorIndex = cursor
      ? filteredExamples.findIndex((example) => example.id === cursor.lastId)
      : -1;

    if (cursor && cursorIndex === -1) {
      throw PublicProblemException.validation([
        {
          pointer: '#/query/cursor',
          detail: 'cursor no longer identifies an item in this collection',
        },
      ]);
    }

    const items = filteredExamples.slice(
      cursorIndex + 1,
      cursorIndex + 1 + query.limit,
    );
    const hasNextPage = cursorIndex + 1 + query.limit < filteredExamples.length;
    const lastItem = items.at(-1);

    return {
      items,
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && lastItem
            ? encodeCursor(lastItem.id, query.currency)
            : null,
      },
    };
  }
}
