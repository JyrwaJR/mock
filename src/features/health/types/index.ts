/**
 * @file Domain types for the server liveness probe.
 */

/** Overall liveness verdict reported by the health check. */
export type HealthStatus = "ok";

/**
 * Payload returned by `GET /api/health`.
 *
 * Shaped for infrastructure probes: a stable `status` discriminator plus
 * low-cardinality process facts. No secrets, hostnames, or PII are exposed.
 */
export interface HealthReport {
  /** Liveness verdict — always `"ok"` when the process can serve the request. */
  status: HealthStatus;
  /** Process uptime in seconds, sourced from the runtime's monotonic clock. */
  uptime: number;
  /** ISO-8601 UTC instant at which the report was produced. */
  timestamp: string;
}

/** Optional clock overrides, used to make {@link HealthReport} deterministic in tests. */
export interface HealthCheckOptions {
  /** Injected "now" instant. Defaults to the current system time. */
  now?: Date;
  /** Injected uptime source in seconds. Defaults to the runtime's process uptime. */
  uptime?: number;
}
