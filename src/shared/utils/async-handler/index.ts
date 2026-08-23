/**
 * @file Async Express route handler wrapper.
 *
 * Eliminates repetitive `try/catch` blocks in Express route handlers by
 * forwarding any rejected promise to the Express error middleware.
 */

import type { RequestHandler } from 'express';

/**
 * Wraps an async Express route handler and forwards errors to Express error middleware.
 *
 * Usage: wrap any async route handler with this to automatically forward
 * uncaught promise rejections to the `next(err)` Express error chain.
 *
 * @param fn - An async Express request handler.
 * @returns A standard `RequestHandler` that executes `fn` and catches errors.
 *
 * @example
 * ```ts
 * app.get("/users", asyncHandler(async (req, res) => {
 *   const users = await getUsers();
 *   res.json(users);
 * }));
 * ```
 */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
