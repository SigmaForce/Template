import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const environmentFile = path.resolve(import.meta.dirname, '../..', '.env');
if (existsSync(environmentFile)) process.loadEnvFile(environmentFile);

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
