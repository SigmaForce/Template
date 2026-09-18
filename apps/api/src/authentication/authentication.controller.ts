import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ProblemDetailsDto } from '../http/problem-details.js';
import { CurrentUser, type AuthenticatedUser } from './authentication.js';

export class AuthenticatedUserDto {
  @ApiProperty({ example: 'user_2RfWKJREkjKbHZy0Wqa5qrHeAnb' })
  id!: string;
}

@ApiTags('Authentication')
@ApiExtraModels(ProblemDetailsDto)
@ApiBearerAuth('clerk-session')
@Controller('auth')
export class AuthenticationController {
  @Get('me')
  @ApiOperation({ operationId: 'getAuthenticatedUser' })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  @ApiResponse({
    status: 401,
    description: 'A valid Clerk session token is required.',
    content: {
      'application/problem+json': {
        schema: { $ref: getSchemaPath(ProblemDetailsDto) },
      },
    },
  })
  getAuthenticatedUser(@CurrentUser() user: AuthenticatedUser) {
    return { id: user.id };
  }
}
