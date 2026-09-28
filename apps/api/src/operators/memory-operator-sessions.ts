import {
  OperatorSessionRepository,
  type StoredOperatorSession,
} from './operator.js';

export class MemoryOperatorSessionRepository extends OperatorSessionRepository {
  private readonly sessions = new Map<string, StoredOperatorSession>();

  constructor(sessions: StoredOperatorSession[] = []) {
    super();
    for (const session of sessions) this.sessions.set(session.id, session);
  }

  async find(id: string) {
    return this.sessions.get(id);
  }

  async revoke(id: string, revokedAt: Date) {
    const session = this.sessions.get(id);
    if (!session || session.revokedAt) return false;
    session.revokedAt = revokedAt;
    return true;
  }
}
