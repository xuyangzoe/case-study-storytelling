import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'error',
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, 'bad_request', details);
  }
  static unauthorized(message = 'Sign in to continue') {
    return new ApiError(401, message, 'unauthorized');
  }
  static forbidden(message = 'You do not have access to this household') {
    return new ApiError(403, message, 'forbidden');
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message, 'not_found');
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, message, 'conflict', details);
  }
}

/** Wraps an async route handler so rejected promises reach the error middleware. */
export function asyncRoute<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as T, res, next).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Some fields need attention',
      code: 'validation_failed',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: error.message,
      code: error.code,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }

  console.error('[multicat] unhandled error', error);
  res.status(500).json({ error: 'Something went wrong', code: 'internal_error' });
}
