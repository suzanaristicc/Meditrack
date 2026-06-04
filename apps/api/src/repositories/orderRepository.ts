import { randomUUID } from 'node:crypto';
import { db } from '../db/database.js';
import type { Order, OrderLine, OrderStatus } from '../types.js';

function mapOrder(row: Record<string, unknown>, lines: OrderLine[] = []): Order {
  return {
    id: String(row.id),
    careUnitId: String(row.care_unit_id),
    careUnitName: row.care_unit_name ? String(row.care_unit_name) : undefined,
    status: row.status as OrderStatus,
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lines
  };
}

function mapOrderLine(row: Record<string, unknown>): OrderLine {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    medicationId: String(row.medication_id),
    medicationName: row.medication_name ? String(row.medication_name) : undefined,
    atcCode: row.atc_code ? String(row.atc_code) : undefined,
    form: row.form ? String(row.form) : undefined,
    strength: row.strength ? String(row.strength) : undefined,
    quantity: Number(row.quantity)
  };
}

export type CreateOrderRecord = {
  id: string;
  careUnitId: string;
  status: OrderStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lines: Array<{ medicationId: string; quantity: number }>;
};

export const orderRepository = {
  list(careUnitId?: string): Order[] {
    const rows = careUnitId
      ? (db.prepare(`
          SELECT orders.*, care_units.name as care_unit_name
          FROM orders
          JOIN care_units ON care_units.id = orders.care_unit_id
          WHERE care_unit_id = ?
          ORDER BY created_at DESC
        `).all(careUnitId) as Record<string, unknown>[])
      : (db.prepare(`
          SELECT orders.*, care_units.name as care_unit_name
          FROM orders
          JOIN care_units ON care_units.id = orders.care_unit_id
          ORDER BY created_at DESC
        `).all() as Record<string, unknown>[]);

    return rows.map((row) => mapOrder(row, this.linesForOrder(String(row.id))));
  },

  findById(id: string): Order | undefined {
    const row = db.prepare(`
      SELECT orders.*, care_units.name as care_unit_name
      FROM orders
      JOIN care_units ON care_units.id = orders.care_unit_id
      WHERE orders.id = ?
    `).get(id) as Record<string, unknown> | undefined;
    return row ? mapOrder(row, this.linesForOrder(id)) : undefined;
  },

  linesForOrder(orderId: string): OrderLine[] {
    const rows = db.prepare(`
      SELECT order_lines.*, medications.name as medication_name, medications.atc_code, medications.form, medications.strength
      FROM order_lines
      JOIN medications ON medications.id = order_lines.medication_id
      WHERE order_lines.order_id = ?
      ORDER BY medications.name
    `).all(orderId) as Record<string, unknown>[];
    return rows.map(mapOrderLine);
  },

  create(record: CreateOrderRecord): Order {
    db.prepare(`
      INSERT INTO orders (id, care_unit_id, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(record.id, record.careUnitId, record.status, record.createdBy, record.createdAt, record.updatedAt);

    const insertLine = db.prepare(`
      INSERT INTO order_lines (id, order_id, medication_id, quantity)
      VALUES (?, ?, ?, ?)
    `);

    for (const line of record.lines) {
      insertLine.run(randomUUID(), record.id, line.medicationId, line.quantity);
    }

    const created = this.findById(record.id);
    if (!created) {
      throw new Error('Order could not be read after creation.');
    }
    return created;
  },

  updateStatus(id: string, expectedStatus: OrderStatus, nextStatus: OrderStatus, updatedAt: string): boolean {
    const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?').run(
      nextStatus,
      updatedAt,
      id,
      expectedStatus
    );
    return result.changes === 1;
  }
};
