import path from 'node:path';
import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

const rootEnvironment = path.resolve(import.meta.dirname, '../..', '.env');
if (existsSync(rootEnvironment)) process.loadEnvFile(rootEnvironment);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.DIRECT_DATABASE_URL ??
      'postgresql://configuration-required@127.0.0.1:5432/configuration-required',
  },
});
