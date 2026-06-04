import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import type { Actor, AuditLog } from '../types.js';
import { nowIso } from '../utils/date.js';

function mapAudit(row: Record<string, unknown>): AuditLog {
  return {
    id: String(row.id),
    actorName: String(row.actor_name),
    actorRole: row.actor_role as AuditLog['actorRole'],
    action: String(row.action),
    entity: String(row.entity),
    entityId: String(row.entity_id),
    beforeJson: row.before_json ? String(row.before_json) : null,
    afterJson: row.after_json ? String(row.after_json) : null,
    createdAt: String(row.created_at)
  };
}

export const auditRepository = {
  add(actor: Actor, action: string, entity: string, entityId: string, before?: unknown, after?: unknown): AuditLog {
    const audit = {
      id: randomUUID(),
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entity,
      entityId,
      beforeJson: before === undefined ? null : JSON.stringify(before),
      afterJson: after === undefined ? null : JSON.stringify(after),
      createdAt: nowIso()
    };

    db.prepare(`
      INSERT INTO audit_logs (id, actor_name, actor_role, action, entity, entity_id, before_json, after_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      audit.id,
      audit.actorName,
      audit.actorRole,
      audit.action,
      audit.entity,
      audit.entityId,
      audit.beforeJson,
      audit.afterJson,
      audit.createdAt
    );

    return audit;
  },

  list(): AuditLog[] {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all() as Record<string, unknown>[];
    return rows.map(mapAudit);
  }
};
