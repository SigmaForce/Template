import { FileRepository, FileStorage, type OrganizationFile } from './file.js';

export class MemoryFileRepository extends FileRepository {
  readonly files = new Map<string, OrganizationFile>();

  async create(file: OrganizationFile) {
    this.files.set(file.id, file);
    return file;
  }

  async delete(input: { id: string; organizationId: string }) {
    const file = await this.find(input);
    if (file) this.files.delete(file.id);
  }

  async find(input: { id: string; organizationId: string }) {
    const file = this.files.get(input.id);
    return file?.organizationId === input.organizationId ? file : undefined;
  }

  async list(organizationId: string) {
    return [...this.files.values()]
      .filter((file) => file.organizationId === organizationId)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      );
  }
}

export class MemoryFileStorage extends FileStorage {
  readonly accesses: Array<{
    action: 'delete' | 'download' | 'upload';
    objectKey: string;
  }> = [];
  readonly objects = new Map<string, Buffer>();

  async delete(objectKey: string) {
    this.accesses.push({ action: 'delete', objectKey });
    this.objects.delete(objectKey);
  }

  async downloadUrl(input: { objectKey: string }) {
    this.accesses.push({ action: 'download', objectKey: input.objectKey });
    return `https://files.test/${encodeURIComponent(input.objectKey)}`;
  }

  async upload(input: { body: Buffer; objectKey: string }) {
    this.accesses.push({ action: 'upload', objectKey: input.objectKey });
    this.objects.set(input.objectKey, Buffer.from(input.body));
  }
}
