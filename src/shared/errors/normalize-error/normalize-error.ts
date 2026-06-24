import { errors } from 'jose';
import { ZodError } from 'zod';

import {
  BadRequestError,
  NotFoundError,
  PaymentError,
  UnauthorizedError,
  ValidationError,
} from '@/src/shared/errors/http-errors/http-errors';
import { AppError } from '@/src/shared/errors/http-errors/base';
/**
 * Type guard to check if an error is a JWT validation error.
 */
const isJwtError = (error: unknown): error is errors.JWTClaimValidationFailed => {
  return error instanceof errors.JOSEError;
};

/**
 * Checks whether an unknown value is a Supabase Storage error-shaped object.
 */
export function isSupabaseStorageError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const err = error as Record<string, unknown>;

  return (
    err.name === 'StorageError' ||
    err.name === 'StorageUnknownError' ||
    typeof err.statusCode === 'string' ||
    typeof (err.error as Record<string, unknown> | undefined)?.message === 'string'
  );
}

/**
 * Converts an unknown error into a typed {@link AppError}.
 *
 * Handles JWT, Zod, Supabase, and generic errors. In production the
 * original error message is hidden behind a generic "Internal Server Error"
 * to avoid leaking internals to the client.
 *
 * @param error - The error to normalise (caught in a try/catch).
 * @returns A typed AppError with the appropriate status code and message.
 */
export const normalizeUnknownError = (error: unknown): AppError => {
  const isProd = process.env?.NODE_ENV === 'production';

  if (isJwtError(error)) {
    return new UnauthorizedError(error.message);
  }

  if (error instanceof UnauthorizedError) {
    return new UnauthorizedError(error.message);
  }

  if (error instanceof NotFoundError) {
    return new NotFoundError(error.message);
  }

  if (isSupabaseStorageError(error)) {
    return new BadRequestError('Supabase storage error');
  }

  if (error instanceof ZodError) {
    return new ValidationError(error.message, error.issues);
  }

  if (error instanceof PaymentError) {
    return new PaymentError(error.message, error.code, error.statusCode);
  }

  if (error instanceof AppError) {
    return error;
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  const displayMessage = isProd ? 'Internal Server Error' : message;

  return new AppError('INTERNAL_ERROR', displayMessage, 500);
};
