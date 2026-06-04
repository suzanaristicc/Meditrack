import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { conflict, notFound } from '../errors.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';
import { medicationRepository, type MedicationFilters } from '../repositories/medicationRepository.js';
import type { Actor } from '../types.js';
import { nowIso } from '../utils/date.js';

export const medicationInputSchema = z.object({
  name: z.string().min(2),
  atcCode: z.string().min(3),
  form: z.string().min(2),
  strength: z.string().min(1),
  stock: z.number().int().min(0),
  threshold: z.number().int().min(0)
});

export type MedicationInput = z.infer<typeof medicationInputSchema>;

function assertCareUnit(careUnitId: string): void {
  if (!careUnitRepository.findById(careUnitId)) {
    throw notFound('Vårdenheten finns inte.');
  }
}

export const medicationService = {
  list(filters: MedicationFilters) {
    assertCareUnit(filters.careUnitId);
    return medicationRepository.list(filters);
  },

  forms: medicationRepository.forms,

  create(input: MedicationInput, careUnitId: string, actor: Actor) {
    assertCareUnit(careUnitId);
    const now = nowIso();
    const medication = medicationRepository.create({
      id: randomUUID(),
      ...input,
      careUnitId,
      createdAt: now,
      updatedAt: now
    });
    auditRepository.add(actor, 'CREATE_MEDICATION', 'medication', medication.id, undefined, { ...medication, careUnitId });
    return medication;
  },

  update(id: string, input: MedicationInput, careUnitId: string, actor: Actor) {
    assertCareUnit(careUnitId);
    const existing = medicationRepository.findById(id, careUnitId);
    if (!existing) throw notFound('Läkemedlet finns inte.');

    const updated = medicationRepository.update(id, careUnitId, input);
    if (!updated) throw notFound('Läkemedlet finns inte efter uppdatering.');

    auditRepository.add(actor, 'UPDATE_MEDICATION', 'medication', id, { ...existing, careUnitId }, { ...updated, careUnitId });
    return updated;
  },

  delete(id: string, actor: Actor) {
    if (!medicationRepository.exists(id)) throw notFound('Läkemedlet finns inte.');
    if (medicationRepository.hasOrderHistory(id)) {
      throw conflict('Läkemedlet finns i beställningshistorik och kan därför inte tas bort. Inaktivering hade varit bättre i produktion.');
    }

    const existing = medicationRepository.findById(id, careUnitRepository.list()[0]?.id ?? '');
    medicationRepository.delete(id);
    auditRepository.add(actor, 'DELETE_MEDICATION', 'medication', id, existing, undefined);
  }
};
