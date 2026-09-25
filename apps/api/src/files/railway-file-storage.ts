import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileStorage } from './file.js';

export interface RailwayFileStorageOptions {
  accessKeyId: string;
  bucket: string;
  endpoint: URL;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
}

export class RailwayFileStorage extends FileStorage {
  private readonly client: S3Client;

  constructor(private readonly options: RailwayFileStorageOptions) {
    super();
    this.client = new S3Client({
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      endpoint: options.endpoint.toString(),
      forcePathStyle: options.forcePathStyle,
      region: options.region,
    });
  }

  async delete(objectKey: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.options.bucket, Key: objectKey }),
    );
  }

  downloadUrl(input: {
    expiresInSeconds: number;
    fileName: string;
    objectKey: string;
  }) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.options.bucket,
        Key: input.objectKey,
        ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(input.fileName)}`,
      }),
      { expiresIn: input.expiresInSeconds },
    );
  }

  async upload(input: {
    body: Buffer;
    contentType: string;
    objectKey: string;
  }) {
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.options.bucket,
        ContentType: input.contentType,
        Key: input.objectKey,
      }),
    );
  }
}
