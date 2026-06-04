export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFound(message = 'Resursen hittades inte'): AppError {
  return new AppError(404, message);
}

export function conflict(message = 'Konflikt vid uppdatering'): AppError {
  return new AppError(409, message);
}

export function forbidden(message = 'Du saknar behörighet för åtgärden'): AppError {
  return new AppError(403, message);
}
