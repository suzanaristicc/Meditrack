import { db } from '../db/database.js';
import type { CareUnit } from '../types.js';

function mapCareUnit(row: Record<string, unknown>): CareUnit {
  return {
    id: String(row.id),
    name: String(row.name),
    location: String(row.location)
  };
}

export const careUnitRepository = {
  list(): CareUnit[] {
    return (db.prepare('SELECT * FROM care_units ORDER BY name').all() as Record<string, unknown>[]).map(mapCareUnit);
  },

  findById(id: string): CareUnit | undefined {
    const row = db.prepare('SELECT * FROM care_units WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    return row ? mapCareUnit(row) : undefined;
  }
};
