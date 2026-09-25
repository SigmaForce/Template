import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '../authentication/authentication.js';
import { AuditEventsService } from '../audit-events/audit-events.service.js';
import { AuthorizationService } from '../authorization/authorization.service.js';
import { Permission, type PermissionId } from '../authorization/permission.js';
import { PublicProblemException } from '../http/problem-details.js';
import { FileRepository, FileStorage, type OrganizationFile } from './file.js';

export const maxFileSize = 10 * 1024 * 1024;
const downloadLifetimeSeconds = 60;
const fileTypes = {
  'application/pdf': { extensions: ['pdf'], signature: Buffer.from('%PDF-') },
  'image/jpeg': {
    extensions: ['jpg', 'jpeg'],
    signature: Buffer.from([0xff, 0xd8, 0xff]),
  },
  'image/png': {
    extensions: ['png'],
    signature: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
} as const;

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class FilesService {
  constructor(
    private readonly repository: FileRepository,
    private readonly storage: FileStorage,
    private readonly authorization: AuthorizationService,
    private readonly auditEvents: AuditEventsService,
  ) {}

  async upload(
    user: AuthenticatedUser,
    organizationId: string,
    upload: UploadedFile | undefined,
  ) {
    this.validateUpload(upload);
    const scope = await this.authorization.authorize({
      permission: Permission.organizationFilesManage,
      targetOrganizationId: organizationId,
      user,
    });
    const file: OrganizationFile = {
      contentType: upload.mimetype,
      createdAt: new Date(),
      createdByUserId: user!.id,
      id: randomUUID(),
      name: upload.originalname,
      objectKey: `${scope.organizationId}/${randomUUID()}`,
      organizationId: scope.organizationId,
      size: upload.size,
    };
    await this.record('organization.file.upload-requested', user!.id, file);
    await this.storage.upload({
      body: upload.buffer,
      contentType: file.contentType,
      objectKey: file.objectKey,
    });
    try {
      return this.toDto(await this.repository.create(file));
    } catch (error) {
      await this.storage.delete(file.objectKey);
      throw error;
    }
  }

  async list(user: AuthenticatedUser, organizationId: string) {
    const scope = await this.authorization.authorize({
      permission: Permission.organizationFilesRead,
      targetOrganizationId: organizationId,
      user,
    });
    return {
      items: (await this.repository.list(scope.organizationId)).map((file) =>
        this.toDto(file),
      ),
    };
  }

  async download(
    user: AuthenticatedUser,
    organizationId: string,
    fileId: string,
  ) {
    const file = await this.authorizedFile(
      user,
      organizationId,
      fileId,
      Permission.organizationFilesRead,
    );
    await this.record('organization.file.download-requested', user!.id, file);
    const expiresAt = new Date(Date.now() + downloadLifetimeSeconds * 1000);
    return {
      expiresAt: expiresAt.toISOString(),
      url: await this.storage.downloadUrl({
        expiresInSeconds: downloadLifetimeSeconds,
        fileName: file.name,
        objectKey: file.objectKey,
      }),
    };
  }

  async delete(
    user: AuthenticatedUser,
    organizationId: string,
    fileId: string,
  ) {
    const file = await this.authorizedFile(
      user,
      organizationId,
      fileId,
      Permission.organizationFilesManage,
    );
    await this.record('organization.file.delete-requested', user!.id, file);
    await this.storage.delete(file.objectKey);
    await this.repository.delete({
      id: file.id,
      organizationId: file.organizationId,
    });
  }

  private async authorizedFile(
    user: AuthenticatedUser,
    organizationId: string,
    fileId: string,
    permission: PermissionId,
  ) {
    const scope = await this.authorization.authorize({
      permission,
      targetOrganizationId: organizationId,
      user,
    });
    const file = await this.repository.find({
      id: fileId,
      organizationId: scope.organizationId,
    });
    if (!file) throw PublicProblemException.fileUnavailable();
    return file;
  }

  private record(
    action:
      | 'organization.file.delete-requested'
      | 'organization.file.download-requested'
      | 'organization.file.upload-requested',
    userId: string,
    file: OrganizationFile,
  ) {
    return this.auditEvents.record({
      action,
      actor: { id: userId, type: 'user' },
      context: {
        contentType: file.contentType,
        name: file.name,
        size: file.size,
      },
      organizationId: file.organizationId,
      target: { id: file.id, type: 'file' },
    });
  }

  private toDto(file: OrganizationFile) {
    const {
      createdByUserId: _createdByUserId,
      objectKey: _objectKey,
      organizationId: _organizationId,
      ...dto
    } = file;
    return { ...dto, createdAt: dto.createdAt.toISOString() };
  }

  private validateUpload(
    upload: UploadedFile | undefined,
  ): asserts upload is UploadedFile {
    const errors: Array<{ detail: string; pointer: string }> = [];
    if (!upload) {
      errors.push({ detail: 'file is required', pointer: '#/body/file' });
    } else {
      const name = upload.originalname;
      const type = fileTypes[upload.mimetype as keyof typeof fileTypes];
      const extension = name.split('.').at(-1)?.toLowerCase();
      if (
        name.length < 1 ||
        name.length > 255 ||
        name.trim() !== name ||
        name
          .split('')
          .some(
            (character) =>
              character.charCodeAt(0) <= 0x1f ||
              character.charCodeAt(0) === 0x7f ||
              character === '\\' ||
              character === '/',
          ) ||
        name === '.' ||
        name === '..'
      ) {
        errors.push({
          detail: 'file name is unsafe',
          pointer: '#/body/file/name',
        });
      }
      if (
        !type ||
        !extension ||
        !(type.extensions as readonly string[]).includes(extension) ||
        !upload.buffer.subarray(0, type.signature.length).equals(type.signature)
      ) {
        errors.push({
          detail: 'file type is not allowed or does not match its content',
          pointer: '#/body/file/type',
        });
      }
      if (upload.size < 1 || upload.size > maxFileSize) {
        errors.push({
          detail: `file size must be between 1 and ${maxFileSize} bytes`,
          pointer: '#/body/file/size',
        });
      }
    }
    if (errors.length > 0) throw PublicProblemException.validation(errors);
  }
}
