/**
 * @file Base application error class used by all typed HTTP errors.
 *
 * Provides a machine-readable `code`, HTTP `statusCode`, and optional
 * `details` payload for structured error handling.
 */

/**
 * Base application error with a machine-readable code, HTTP status, and optional details.
 *
 * Extends `Error` and preserves the prototype chain for reliable `instanceof` checks.
 * All typed HTTP error classes should extend this class.
 *
 * @example
 * ```ts
 * class NotFoundError extends AppError {
 *   constructor(resource: string) {
 *     super("NOT_FOUND", `${resource} not found`, 404);
 *   }
 * }
 * ```
 */
export class AppError extends Error {
  /**
   * @param code       - Machine-readable error code (e.g. `"VALIDATION_ERROR"`).
   * @param message    - Human-readable error description.
   * @param statusCode - HTTP status code (default `500`).
   * @param details    - Optional structured error context (e.g. validation errors).
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
