export interface OrganizationFile {
  contentType: string;
  createdAt: Date;
  createdByUserId: string;
  id: string;
  name: string;
  objectKey: string;
  organizationId: string;
  size: number;
}

export abstract class FileRepository {
  abstract create(file: OrganizationFile): Promise<OrganizationFile>;
  abstract delete(input: { id: string; organizationId: string }): Promise<void>;
  abstract find(input: {
    id: string;
    organizationId: string;
  }): Promise<OrganizationFile | undefined>;
  abstract list(organizationId: string): Promise<OrganizationFile[]>;
}

export abstract class FileStorage {
  abstract delete(objectKey: string): Promise<void>;
  abstract downloadUrl(input: {
    expiresInSeconds: number;
    fileName: string;
    objectKey: string;
  }): Promise<string>;
  abstract upload(input: {
    body: Buffer;
    contentType: string;
    objectKey: string;
  }): Promise<void>;
}
