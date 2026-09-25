import { type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { FileRepository, type OrganizationFile } from './file.js';

export class PrismaFileRepository
  extends FileRepository
  implements OnModuleDestroy
{
  private readonly client: PrismaClient;

  constructor(connectionString: string) {
    super();
    this.client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async create(file: OrganizationFile) {
    return this.client.file.create({ data: file });
  }

  async delete(input: { id: string; organizationId: string }) {
    await this.client.file.deleteMany({ where: input });
  }

  async find(input: { id: string; organizationId: string }) {
    return (await this.client.file.findFirst({ where: input })) ?? undefined;
  }

  async list(organizationId: string) {
    return this.client.file.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
