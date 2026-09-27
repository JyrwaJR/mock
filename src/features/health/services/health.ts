/**
 * @file Pure service backing the server liveness probe.
 *
 * Kept free of framework imports so it can be unit-tested without booting a
 * Next.js request context.
 */

import {
  HealthCheckOptions,
  HealthReport,
} from "@/src/features/health/types";

/**
 * Reads the process uptime in seconds.
 *
 * Prefers `process.uptime()` (available in Node and edge runtimes); falls back
 * to `0` when no process object is exposed, so the endpoint still reports a
 * well-formed payload in constrained runtimes.
 *
 * @returns Uptime in seconds, or `0` when unavailable.
 */
function readUptime(): number {
  if (typeof process !== "undefined" && typeof process.uptime === "function") {
    return process.uptime();
  }
  return 0;
}

/**
 * Builds the liveness report for the running server.
 *
 * The report intentionally contains only low-sensitivity process facts
 * (status, uptime, timestamp) so the endpoint is safe to expose publicly and
 * can be polled by uptime monitors, load balancers, and container
 * orchestrators.
 *
 * @param options - Optional clock overrides for deterministic tests.
 * @returns A {@link HealthReport} with `status` `"ok"`.
 * @example
 *   checkHealth();
 *   // → { status: 'ok', uptime: 412.53, timestamp: '2026-09-27T12:34:56.789Z' }
 */
export function checkHealth(options: HealthCheckOptions = {}): HealthReport {
  const now = options.now ?? new Date();

  return {
    status: "ok",
    uptime: options.uptime ?? readUptime(),
    timestamp: now.toISOString(),
  };
}
