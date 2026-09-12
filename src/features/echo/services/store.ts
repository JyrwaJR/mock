import type { CapturedPayload } from "@/src/features/echo/types";

/**
 * Key under which the latest captured payload is stored on `globalThis`.
 * Using `globalThis` (rather than a module-level variable) keeps the capture
 * alive across Next.js dev hot-reloads, where route module state resets.
 */
const STORE_KEY = "__echoCapturedPayload__";

type EchoStore = {
  payload: CapturedPayload | null;
};

/** Returns the shared store object, lazily initialised on first use. */
function store(): EchoStore {
  const g = globalThis as Record<string, unknown>;
  const existing = g[STORE_KEY] as EchoStore | undefined;
  if (!existing) {
    g[STORE_KEY] = { payload: null };
  }
  return g[STORE_KEY] as EchoStore;
}

/**
 * Returns the latest captured payload, or `null` when nothing has been
 * captured yet (or after {@link resetStore}).
 */
export function getCaptured(): CapturedPayload | null {
  return store().payload;
}

/**
 * Stores the payload returned by future `GET /api/echo` calls. Replaces any
 * previously captured payload (last write wins).
 *
 * @param payload - The raw body text and content type to capture.
 */
export function setCaptured(payload: CapturedPayload): void {
  store().payload = payload;
}

/**
 * Clears the captured payload. Exported primarily for manual debugging; a
 * `GET` after reset returns 404 until the next `POST`.
 */
export function resetStore(): void {
  store().payload = null;
}