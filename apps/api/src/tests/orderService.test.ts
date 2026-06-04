import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { before, describe, it } from 'node:test';

const tempDbPath = path.join(os.tmpdir(), `meditrack-test-${Date.now()}.db`);
if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
process.env.DATABASE_URL = `file:${tempDbPath}`;

const { db } = await import('../db/database.js');
const { migrate } = await import('../db/schema.js');
const { orderService } = await import('../services/orderService.js');
const { medicationRepository } = await import('../repositories/medicationRepository.js');
const { careUnitRepository } = await import('../repositories/careUnitRepository.js');

before(() => {
  migrate();
  db.prepare('INSERT INTO care_units (id, name, location) VALUES (?, ?, ?)').run('unit-test', 'Testenhet', 'Stockholm');
  medicationRepository.create({
    id: 'med-test',
    careUnitId: 'unit-test',
    name: 'Testmedicin',
    atcCode: 'T00AA00',
    form: 'Tablett',
    strength: '10 mg',
    stock: 5,
    threshold: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
});

describe('orderService', () => {
  it('updates the selected care unit stock exactly when an order reaches Levererad', () => {
    assert.ok(careUnitRepository.findById('unit-test'));

    const actor = { name: 'Test Pharmacist', role: 'pharmacist' as const };
    const order = orderService.create({ careUnitId: 'unit-test', lines: [{ medicationId: 'med-test', quantity: 7 }] }, actor);

    assert.equal(medicationRepository.findById('med-test', 'unit-test')?.stock, 5);

    orderService.updateStatus(order.id, 'Skickad', actor);
    orderService.updateStatus(order.id, 'Bekräftad', actor);
    orderService.updateStatus(order.id, 'Levererad', actor);

    assert.equal(medicationRepository.findById('med-test', 'unit-test')?.stock, 12);
  });

  it('rejects invalid status jumps', () => {
    const actor = { name: 'Test Nurse', role: 'nurse' as const };
    const order = orderService.create({ careUnitId: 'unit-test', lines: [{ medicationId: 'med-test', quantity: 1 }] }, actor);

    assert.throws(() => orderService.updateStatus(order.id, 'Levererad', actor), /Status kan inte/);
  });
});
