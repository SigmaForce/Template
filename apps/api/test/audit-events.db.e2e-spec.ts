import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaAuditEventRepository } from '../src/audit-events/prisma-audit-event.repository.js';

const databaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Audit Events with PostgreSQL', () => {
  let pool: Pool;
  let repository: PrismaAuditEventRepository;

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await pool.query('TRUNCATE audit_events, organizations CASCADE');
    await pool.query(
      `INSERT INTO organizations (id, name, slug, locale, time_zone, updated_at)
       VALUES ('org_audit_db', 'Audit DB', 'audit-db', 'en-US', 'UTC', CURRENT_TIMESTAMP)`,
    );
    repository = new PrismaAuditEventRepository(databaseUrl!);
  });

  it('persists Organization-scoped events and rejects UPDATE and DELETE', async () => {
    const id = randomUUID();
    await repository.append({
      action: 'organization.settings.update-requested',
      actor: { id: 'user_owner', type: 'user' },
      context: { changedFields: ['name'] },
      id,
      occurredAt: new Date('2026-09-24T20:00:00.000Z'),
      organizationId: 'org_audit_db',
      target: { id: 'org_audit_db', type: 'organization' },
    });

    await expect(
      repository.list({ limit: 20, organizationId: 'org_audit_db' }),
    ).resolves.toMatchObject([{ id, organizationId: 'org_audit_db' }]);
    await expect(
      repository.list({ limit: 20, organizationId: 'org_other' }),
    ).resolves.toEqual([]);
    await expect(
      pool.query(`UPDATE audit_events SET action = 'tampered' WHERE id = $1`, [
        id,
      ]),
    ).rejects.toThrow('Audit Events are immutable');
    await expect(
      pool.query('DELETE FROM audit_events WHERE id = $1', [id]),
    ).rejects.toThrow('Audit Events are immutable');
  });

  afterAll(async () => {
    await repository.onModuleDestroy();
    await pool.end();
  });
});
