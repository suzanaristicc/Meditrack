import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { auditRepository } from '../repositories/auditRepository.js';

export const auditRouter = Router();

auditRouter.get(
  '/',
  asyncHandler((_req, res) => {
    res.json(auditRepository.list());
  })
);
