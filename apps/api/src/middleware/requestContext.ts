import type { NextFunction, Request, Response } from 'express';
import { forbidden } from '../errors.js';
import type { Actor, ActorRole } from '../types.js';

const roles: ActorRole[] = ['nurse', 'pharmacist', 'admin'];

export type RequestWithActor = Request & { actor: Actor };

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  const rawRole = String(req.header('x-user-role') ?? 'nurse');
  const role = roles.includes(rawRole as ActorRole) ? (rawRole as ActorRole) : 'nurse';
  const name = String(req.header('x-user-name') ?? 'Demo User');

  (req as RequestWithActor).actor = { name, role };
  next();
}

export function requireRole(...allowedRoles: ActorRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { role } = (req as RequestWithActor).actor;
    if (!allowedRoles.includes(role)) {
      next(forbidden(`Rollen ${role} får inte utföra åtgärden.`));
      return;
    }
    next();
  };
}
