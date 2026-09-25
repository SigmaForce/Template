import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../authentication/authentication.js';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { FileDownloadDto, FileDto, FileListDto } from './file.dto.js';
import {
  FilesService,
  maxFileSize,
  type UploadedFile as UploadedFileInput,
} from './files.service.js';

@ApiTags('files')
@ApiBearerAuth('clerk-session')
@Controller('organizations/:organizationId/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post()
  @ApiOperation({ operationId: 'uploadOrganizationFile' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: FileDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: maxFileSize, files: 1 } }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @UploadedFile() file: UploadedFileInput | undefined,
  ) {
    return this.files.upload(user, organizationId, file);
  }

  @Get()
  @ApiOperation({ operationId: 'listOrganizationFiles' })
  @ApiOkResponse({ type: FileListDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
  ) {
    return this.files.list(user, organizationId);
  }

  @Get(':fileId/download')
  @ApiOperation({ operationId: 'downloadOrganizationFile' })
  @ApiOkResponse({ type: FileDownloadDto })
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.files.download(user, organizationId, fileId);
  }

  @Delete(':fileId')
  @HttpCode(204)
  @ApiOperation({ operationId: 'deleteOrganizationFile' })
  @ApiNoContentResponse()
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Param('fileId') fileId: string,
  ) {
    await this.files.delete(user, organizationId, fileId);
  }
}
