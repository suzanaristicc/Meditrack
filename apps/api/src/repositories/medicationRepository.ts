import { db } from '../db/database.js';
import { nowIso } from '../utils/date.js';
import type { Medication } from '../types.js';

function mapMedication(row: Record<string, unknown>): Medication {
  return {
    id: String(row.id),
    name: String(row.name),
    atcCode: String(row.atc_code),
    form: String(row.form),
    strength: String(row.strength),
    stock: Number(row.stock ?? 0),
    threshold: Number(row.threshold ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export type MedicationFilters = {
  careUnitId: string;
  search?: string;
  form?: string;
  belowThreshold?: boolean;
};

export type MedicationRecordInput = Omit<Medication, 'stock' | 'threshold'> & {
  careUnitId: string;
  stock: number;
  threshold: number;
};

export const medicationRepository = {
  list(filters: MedicationFilters): Medication[] {
    const rows = db.prepare(`
      SELECT medications.*, inventory_levels.stock, inventory_levels.threshold
      FROM medications
      LEFT JOIN inventory_levels
        ON inventory_levels.medication_id = medications.id
       AND inventory_levels.care_unit_id = ?
      ORDER BY medications.name
    `).all(filters.careUnitId) as Record<string, unknown>[];

    return rows.map(mapMedication).filter((medication) => {
      const search = filters.search?.trim().toLowerCase();
      const matchesSearch = search
        ? medication.name.toLowerCase().includes(search) ||
          medication.atcCode.toLowerCase().includes(search) ||
          medication.form.toLowerCase().includes(search)
        : true;
      const matchesForm = filters.form ? medication.form === filters.form : true;
      const matchesThreshold = filters.belowThreshold ? medication.stock < medication.threshold : true;
      return matchesSearch && matchesForm && matchesThreshold;
    });
  },

  findById(id: string, careUnitId: string): Medication | undefined {
    const row = db.prepare(`
      SELECT medications.*, inventory_levels.stock, inventory_levels.threshold
      FROM medications
      LEFT JOIN inventory_levels
        ON inventory_levels.medication_id = medications.id
       AND inventory_levels.care_unit_id = ?
      WHERE medications.id = ?
    `).get(careUnitId, id) as Record<string, unknown> | undefined;
    return row ? mapMedication(row) : undefined;
  },

  exists(id: string): boolean {
    const row = db.prepare('SELECT id FROM medications WHERE id = ?').get(id) as { id: string } | undefined;
    return Boolean(row);
  },

  create(input: MedicationRecordInput): Medication {
    db.prepare(`
      INSERT INTO medications (id, name, atc_code, form, strength, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(input.id, input.name, input.atcCode, input.form, input.strength, input.createdAt, input.updatedAt);

    const careUnits = db.prepare('SELECT id FROM care_units').all() as Array<{ id: string }>;
    const insertInventory = db.prepare(`
      INSERT INTO inventory_levels (care_unit_id, medication_id, stock, threshold, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const unit of careUnits) {
      insertInventory.run(
        unit.id,
        input.id,
        unit.id === input.careUnitId ? input.stock : 0,
        input.threshold,
        input.updatedAt
      );
    }

    return {
      id: input.id,
      name: input.name,
      atcCode: input.atcCode,
      form: input.form,
      strength: input.strength,
      stock: input.stock,
      threshold: input.threshold,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };
  },

  update(id: string, careUnitId: string, input: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>): Medication | undefined {
    const updatedAt = nowIso();
    db.prepare(`
      UPDATE medications
      SET name = ?, atc_code = ?, form = ?, strength = ?, updated_at = ?
      WHERE id = ?
    `).run(input.name, input.atcCode, input.form, input.strength, updatedAt, id);

    db.prepare(`
      INSERT INTO inventory_levels (care_unit_id, medication_id, stock, threshold, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(care_unit_id, medication_id) DO UPDATE SET
        stock = excluded.stock,
        threshold = excluded.threshold,
        updated_at = excluded.updated_at
    `).run(careUnitId, id, input.stock, input.threshold, updatedAt);

    const row = db.prepare(`
      SELECT medications.*, inventory_levels.stock, inventory_levels.threshold
      FROM medications
      LEFT JOIN inventory_levels
        ON inventory_levels.medication_id = medications.id
       AND inventory_levels.care_unit_id = ?
      WHERE medications.id = ?
    `).get(careUnitId, id) as Record<string, unknown> | undefined;
    return row ? mapMedication(row) : undefined;
  },

  delete(id: string): void {
    db.prepare('DELETE FROM inventory_levels WHERE medication_id = ?').run(id);
    db.prepare('DELETE FROM stock_events WHERE medication_id = ?').run(id);
    db.prepare('DELETE FROM medications WHERE id = ?').run(id);
  },

  hasOrderHistory(id: string): boolean {
    const row = db.prepare('SELECT 1 as exists_flag FROM order_lines WHERE medication_id = ? LIMIT 1').get(id) as
      | { exists_flag: number }
      | undefined;
    return Boolean(row);
  },

  incrementStock(careUnitId: string, medicationId: string, quantity: number): void {
    db.prepare(`
      UPDATE inventory_levels
      SET stock = stock + ?, updated_at = ?
      WHERE care_unit_id = ? AND medication_id = ?
    `).run(quantity, nowIso(), careUnitId, medicationId);
  },

  forms(): string[] {
    const rows = db.prepare('SELECT DISTINCT form FROM medications ORDER BY form').all() as { form: string }[];
    return rows.map((row) => row.form);
  }
};
