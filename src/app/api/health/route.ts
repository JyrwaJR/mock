import { NextResponse } from "next/server";
import { checkHealth } from "@/src/features/health";

/** Never cache — the probe must reflect live process state. */
export const dynamic = "force-dynamic";

/**
 * Server liveness probe.
 *
 * Returns `200` with `{ status, uptime, timestamp }` whenever the process can
 * serve a request. Intended for uptime monitors, load balancer health checks,
 * and container orchestrator probes. The payload carries only low-sensitivity
 * process facts — no secrets, hostnames, or PII — so the route is safe to
 * expose publicly and requires no authentication.
 *
 * @example
 *   GET /api/health
 *   → 200 { "status": "ok", "uptime": 412.53, "timestamp": "2026-09-27T12:34:56.789Z" }
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(checkHealth());
}
