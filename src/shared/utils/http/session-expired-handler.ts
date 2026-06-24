/**
 * @file Session-expired callback manager.
 *
 * Provides a global hook that application code can register to react
 * when the user's session expires (e.g., redirect to login).
 */

let handler: (() => void) | null = null;

/**
 * Registers a callback that fires when the session expires.
 *
 * @param newHandler - The handler to invoke, or `null` to clear.
 */
export function setSessionExpiredHandler(newHandler: (() => void) | null): void {
  handler = newHandler;
}

/**
 * Invokes the registered session-expired handler, if any.
 */
export function triggerSessionExpired(): void {
  handler?.();
}
