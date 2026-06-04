import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      message: 'Valideringsfel',
      issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, details: error.details });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'Ett oväntat fel inträffade.' });
}
