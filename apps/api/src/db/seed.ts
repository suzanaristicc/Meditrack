import { randomUUID } from 'node:crypto';
import { db } from './database.js';
import { migrate } from './schema.js';
import { daysAgoIso, nowIso } from '../utils/date.js';

migrate();

const existing = db.prepare('SELECT COUNT(*) as count FROM medications').get() as { count: number };

if (existing.count > 0) {
  console.log('Seed skipped: database already contains medications.');
  process.exit(0);
}

const createdAt = nowIso();

const careUnits = [
  ['unit-city', 'Vårdcentral City', 'Stockholm'],
  ['unit-north', 'Närakut Norr', 'Solna'],
  ['unit-south', 'Äldreboende Södergården', 'Nacka']
] as const;

const insertCareUnit = db.prepare('INSERT INTO care_units (id, name, location) VALUES (?, ?, ?)');
for (const unit of careUnits) insertCareUnit.run(...unit);

const insertMedication = db.prepare(`
  INSERT INTO medications (id, name, atc_code, form, strength, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const medications = [
  ['med-paracetamol', 'Paracetamol', 'N02BE01', 'Tablett', '500 mg'],
  ['med-insulin', 'Insulin glargin', 'A10AE04', 'Injektionslösning', '100 E/ml'],
  ['med-amoxicillin', 'Amoxicillin', 'J01CA04', 'Kapsel', '500 mg'],
  ['med-salbutamol', 'Salbutamol', 'R03AC02', 'Inhalation', '100 mikrogram/dos'],
  ['med-metoprolol', 'Metoprolol', 'C07AB02', 'Depottablett', '50 mg'],
  ['med-furosemide', 'Furosemid', 'C03CA01', 'Tablett', '40 mg']
] as const;

for (const medication of medications) {
  insertMedication.run(...medication, createdAt, createdAt);
}

const inventoryByCareUnit: Record<string, Array<[string, number, number]>> = {
  'unit-city': [
    ['med-paracetamol', 42, 30],
    ['med-insulin', 8, 12],
    ['med-amoxicillin', 64, 20],
    ['med-salbutamol', 14, 15],
    ['med-metoprolol', 33, 25],
    ['med-furosemide', 18, 20]
  ],
  'unit-north': [
    ['med-paracetamol', 28, 30],
    ['med-insulin', 16, 12],
    ['med-amoxicillin', 22, 20],
    ['med-salbutamol', 7, 15],
    ['med-metoprolol', 41, 25],
    ['med-furosemide', 24, 20]
  ],
  'unit-south': [
    ['med-paracetamol', 76, 35],
    ['med-insulin', 6, 12],
    ['med-amoxicillin', 18, 20],
    ['med-salbutamol', 20, 15],
    ['med-metoprolol', 12, 25],
    ['med-furosemide', 9, 20]
  ]
};

const insertInventory = db.prepare(`
  INSERT INTO inventory_levels (care_unit_id, medication_id, stock, threshold, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);

for (const [careUnitId, levels] of Object.entries(inventoryByCareUnit)) {
  for (const [medicationId, stock, threshold] of levels) {
    insertInventory.run(careUnitId, medicationId, stock, threshold, createdAt);
  }
}

const insertStockEvent = db.prepare(`
  INSERT INTO stock_events (id, care_unit_id, medication_id, order_id, delta, reason, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const careUnit of careUnits) {
  const careUnitId = careUnit[0];
  for (const [medicationId] of medications) {
    for (const days of [28, 24, 20, 16, 12, 8, 4]) {
      const usage = medicationId === 'med-insulin' || medicationId === 'med-salbutamol' ? -2 : -5;
      insertStockEvent.run(randomUUID(), careUnitId, medicationId, null, usage, 'Historisk förbrukning', daysAgoIso(days));
    }
  }
}

const insertAuditLog = db.prepare(`
  INSERT INTO audit_logs (id, actor_name, actor_role, action, entity, entity_id, before_json, after_json, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertAuditLog.run(
  randomUUID(),
  'System',
  'admin',
  'SEED_DATABASE',
  'system',
  'seed',
  null,
  JSON.stringify({ medications: medications.length, careUnits: careUnits.length, inventoryLevels: Object.values(inventoryByCareUnit).flat().length }),
  createdAt
);

console.log('Seed completed.');
