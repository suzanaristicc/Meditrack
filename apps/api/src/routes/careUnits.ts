import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { careUnitRepository } from '../repositories/careUnitRepository.js';

export const careUnitsRouter = Router();

careUnitsRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(careUnitRepository.list());
  })
);
