import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { EchoEntry, EchoRegistry } from "@/src/features/echo/types";

/**
 * Key under which the in-memory registry cache is stored on `globalThis`.
 * Using `globalThis` (rather than a module-level variable) keeps the cache
 * alive across Next.js dev hot-reloads, where route module state resets.
 */
const STORE_KEY = "__echoRegistry__";

/**
 * Reserved registry key for the fallback entry registered without a `url`.
 *
 * Since every URL-derived key is normalized to start with `/`, the `"*"`
 * wildcard can never collide with a real path. Lookups on `/api/echo/*` fall
 * back to this entry when no exact path match exists.
 */
export const DEFAULT_ENTRY_KEY = "*";

type EchoStore = {
  /** Lazily populated registry cache; `null` until first access. */
  registry: EchoRegistry | null;
};

/**
 * Resolves the JSON file that persists the registry.
 *
 * Honors `ECHO_REGISTRY_FILE` when set; otherwise defaults to
 * `data/echo/registry.json` under the current working directory. Resolved
 * lazily on each call so callers (e.g. tests or a fresh server session) can
 * point it somewhere else via the environment.
 */
function registryFilePath(): string {
  const override = process.env.ECHO_REGISTRY_FILE;
  if (override) {
    return override;
  }
  // Statically scoped under the project `data/` dir so Turbopack's trace
  // analysis does not pull the whole project into the server bundle.
  return path.join(process.cwd(), "data", "echo", "registry.json");
}

/** Returns the shared store object, lazily initialised on first use. */
function store(): EchoStore {
  const g = globalThis as Record<string, unknown>;
  const existing = g[STORE_KEY] as EchoStore | undefined;
  if (!existing) {
    g[STORE_KEY] = { registry: null };
  }
  return g[STORE_KEY] as EchoStore;
}

/**
 * Reads and parses the persisted registry file.
 *
 * A missing file yields an empty registry; a corrupt file logs a warning and
 * also yields an empty registry so a bad file never crashes the API.
 */
function loadFromFile(): EchoRegistry {
  const filePath = registryFilePath();

  let raw: string;
  try {
    // The path may be overridden via ECHO_REGISTRY_FILE, so Turbopack's trace
    // analysis cannot statically scope it; the default is already scoped to
    // the project `data/` dir, so opt out of whole-project tracing here.
    raw = readFileSync(/*turbopackIgnore: true*/ filePath, "utf8");
  } catch {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as EchoRegistry;
    }
  } catch {
    console.warn(`[echo] Ignoring corrupt registry file at ${filePath}`);
  }
  return {};
}

/**
 * Returns the registry cache, loading it from the JSON file on first access.
 */
function ensureLoaded(): EchoRegistry {
  const s = store();
  if (!s.registry) {
    s.registry = loadFromFile();
  }
  return s.registry;
}

/**
 * Atomically writes the whole registry to the JSON file.
 *
 * Writes to a sibling `.tmp` file first, then renames it over the target so a
 * crash mid-write can never leave a truncated registry behind. Creates parent
 * directories as needed. Synchronous for simplicity — the registry is small
 * and this is a mock-server tool.
 */
function persist(registry: EchoRegistry): void {
  const filePath = registryFilePath();
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(registry, null, 2), "utf8");
  renameSync(tmpPath, filePath);
}

/**
 * Returns the entry registered for a URL, or `undefined` when none exists.
 *
 * Triggers a lazy load of the persisted registry on first call after startup,
 * so entries written in a previous server session are visible here.
 *
 * @param url - Normalized registry key (e.g. `/articles/1`).
 */
export function getEntry(url: string): EchoEntry | undefined {
  return ensureLoaded()[url];
}

/**
 * Registers (or replaces) the entry for a URL and persists it to disk.
 *
 * Last write per URL wins: an existing entry's `data` and `status_code` are
 * overwritten, and the JSON file reflects the new value immediately so the
 * change survives server restarts.
 *
 * @param url - Normalized registry key (e.g. `/articles/1`).
 * @param entry - The mock data and optional status code to store.
 */
export function setEntry(url: string, entry: EchoEntry): void {
  const registry = ensureLoaded();
  registry[url] = entry;
  persist(registry);
}

/**
 * Returns all registered entries keyed by their normalized URL.
 *
 * The returned record is the live in-memory cache; serialize it (e.g. via
 * `Response.json`) rather than mutating it directly.
 */
export function getAllEntries(): EchoRegistry {
  return ensureLoaded();
}

/**
 * Clears the registry: drops the in-memory cache, empties it, and removes the
 * persisted JSON file if present. Exported primarily for manual debugging and
 * for resetting state between test runs.
 */
export function resetStore(): void {
  const s = store();
  s.registry = {};
  try {
    rmSync(registryFilePath(), { force: true });
  } catch {
    // Best effort — an absent or unremovable file is a non-fatal condition.
  }
}