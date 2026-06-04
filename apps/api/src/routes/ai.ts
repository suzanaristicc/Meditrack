import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';
import { aiService } from '../services/aiService.js';

export const aiRouter = Router();

function resolveCareUnitId(rawCareUnitId: unknown): string {
  if (typeof rawCareUnitId === 'string' && rawCareUnitId.length > 0) return rawCareUnitId;
  return careUnitRepository.list()[0]?.id ?? '';
}

aiRouter.get(
  '/replenishment-suggestions',
  asyncHandler((req, res) => {
    res.json(aiService.replenishmentSuggestions(resolveCareUnitId(req.query.careUnitId)));
  })
);
