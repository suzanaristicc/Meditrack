import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireRole, type RequestWithActor } from '../middleware/requestContext.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';
import { medicationInputSchema, medicationService } from '../services/medicationService.js';

export const medicationsRouter = Router();

function resolveCareUnitId(rawCareUnitId: unknown): string {
  if (typeof rawCareUnitId === 'string' && rawCareUnitId.length > 0) return rawCareUnitId;
  return careUnitRepository.list()[0]?.id ?? '';
}

medicationsRouter.get(
  '/',
  asyncHandler((req, res) => {
    res.json(
      medicationService.list({
        careUnitId: resolveCareUnitId(req.query.careUnitId),
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        form: typeof req.query.form === 'string' ? req.query.form : undefined,
        belowThreshold: req.query.belowThreshold === 'true'
      })
    );
  })
);

medicationsRouter.get(
  '/forms',
  asyncHandler((_req, res) => {
    res.json(medicationService.forms());
  })
);

medicationsRouter.post(
  '/',
  requireRole('pharmacist', 'admin'),
  asyncHandler((req, res) => {
    const input = medicationInputSchema.parse(req.body);
    const careUnitId = resolveCareUnitId(req.query.careUnitId);
    const medication = medicationService.create(input, careUnitId, (req as RequestWithActor).actor);
    res.status(201).json(medication);
  })
);

medicationsRouter.put(
  '/:id',
  requireRole('pharmacist', 'admin'),
  asyncHandler((req, res) => {
    const input = medicationInputSchema.parse(req.body);
    const careUnitId = resolveCareUnitId(req.query.careUnitId);
    res.json(medicationService.update(req.params.id, input, careUnitId, (req as RequestWithActor).actor));
  })
);

medicationsRouter.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler((req, res) => {
    medicationService.delete(req.params.id, (req as RequestWithActor).actor);
    res.status(204).send();
  })
);
