import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import { daysAgoIso, nowIso } from '../utils/date.js';

export type StockEvent = {
  id: string;
  careUnitId: string;
  medicationId: string;
  orderId?: string | null;
  delta: number;
  reason: string;
  createdAt: string;
};

export const stockEventRepository = {
  add(input: Omit<StockEvent, 'id' | 'createdAt'>): StockEvent {
    const event: StockEvent = {
      id: randomUUID(),
      ...input,
      createdAt: nowIso()
    };

    db.prepare(`
      INSERT INTO stock_events (id, care_unit_id, medication_id, order_id, delta, reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(event.id, event.careUnitId, event.medicationId, event.orderId ?? null, event.delta, event.reason, event.createdAt);

    return event;
  },

  usageLastDays(careUnitId: string, medicationId: string, days: number): number {
    const since = daysAgoIso(days);
    const row = db.prepare(`
      SELECT COALESCE(SUM(ABS(delta)), 0) as usage
      FROM stock_events
      WHERE care_unit_id = ?
        AND medication_id = ?
        AND delta < 0
        AND created_at >= ?
    `).get(careUnitId, medicationId, since) as { usage: number };

    return Number(row.usage ?? 0);
  }
};
