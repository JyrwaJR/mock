import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_LOGS_BYTES, type LogEntry } from "@/src/features/logs/types";
import {
  appendLogEntries,
  clearLogStore,
  logsFilePath,
  readLogEntries,
} from "../store";

let dataDir: string;
let tempDirs: string[];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "logs-store-"));
  tempDirs.push(dir);
  return dir;
}

function entry(n: number, message = `msg-${n}`): LogEntry {
  return {
    app: "test",
    type: "info",
    message,
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
  };
}

beforeEach(() => {
  tempDirs = [];
  delete process.env.LOGS_DATA_DIR;
  dataDir = makeTempDir();
  process.env.LOGS_DATA_DIR = dataDir;
});

afterEach(() => {
  delete process.env.LOGS_DATA_DIR;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
  vi.restoreAllMocks();
});

describe("logsFilePath", () => {
  it("uses LOGS_DATA_DIR when set", () => {
    expect(logsFilePath()).toBe(path.join(dataDir, "logs.json"));
  });

  it("defaults to data/logs/logs.json under cwd", () => {
    delete process.env.LOGS_DATA_DIR;
    expect(logsFilePath()).toBe(
      path.join(process.cwd(), "data", "logs", "logs.json"),
    );
  });
});

describe("appendLogEntries / readLogEntries", () => {
  it("round-trips entries preserving order and structure", async () => {
    await appendLogEntries([entry(1), entry(2)]);
    const result = await readLogEntries();
    expect(result).toEqual([entry(1), entry(2)]);
  });

  it("accumulates across calls", async () => {
    await appendLogEntries([entry(1)]);
    await appendLogEntries([entry(2)]);
    expect(await readLogEntries()).toHaveLength(2);
  });

  it("returns an empty array when the file is absent", async () => {
    expect(await readLogEntries()).toEqual([]);
  });

  it("preserves an arbitrary content payload", async () => {
    const withContent: LogEntry = {
      ...entry(5),
      content: { nested: { deep: [1, 2, 3] }, ok: true, missing: null },
    };
    await appendLogEntries([withContent]);
    expect(await readLogEntries()).toEqual([withContent]);
  });
});

describe("byte cap", () => {
  it("drops oldest entries to keep the store within MAX_LOGS_BYTES", async () => {
    const big = "x".repeat(100_000); // ~100 KB per entry
    const entries = Array.from({ length: 15 }, (_, i) => entry(i, big));

    const result = await appendLogEntries(entries);
    const stored = await readLogEntries();

    expect(result.stored).toBe(15);
    expect(result.dropped).toBeGreaterThan(0);
    expect(
      new TextEncoder().encode(JSON.stringify(stored)).byteLength,
    ).toBeLessThanOrEqual(MAX_LOGS_BYTES);
    // The newest entry survives; the oldest is gone.
    expect(stored.at(-1)).toEqual(entry(14, big));
    expect(stored).not.toContainEqual(entry(0, big));
  });
});

describe("clearLogStore", () => {
  it("returns the count before clearing and empties the store", async () => {
    await appendLogEntries([entry(1), entry(2)]);
    expect(await clearLogStore()).toBe(2);
    expect(await readLogEntries()).toEqual([]);
  });

  it("is idempotent — a second call returns 0 and does not throw", async () => {
    expect(await clearLogStore()).toBe(0);
    await expect(clearLogStore()).resolves.toBe(0);
  });
});

describe("resilience", () => {
  it("yields [] for an unparseable file instead of throwing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeFileSync(logsFilePath(), "{ not json", "utf8");
    await expect(readLogEntries()).resolves.toEqual([]);
  });

  it("yields [] for valid JSON that is not an array", async () => {
    writeFileSync(logsFilePath(), JSON.stringify({ unexpected: true }), "utf8");
    await expect(readLogEntries()).resolves.toEqual([]);
  });
});

describe("lazy environment resolution", () => {
  it("re-resolves the path when LOGS_DATA_DIR changes mid-process", async () => {
    expect(logsFilePath()).toBe(path.join(dataDir, "logs.json"));
    await appendLogEntries([entry(1)]);

    const secondDir = makeTempDir();
    process.env.LOGS_DATA_DIR = secondDir;

    expect(logsFilePath()).toBe(path.join(secondDir, "logs.json"));
    expect(await readLogEntries()).toEqual([]);
    expect(existsSync(path.join(dataDir, "logs.json"))).toBe(true);
  });
});

describe("concurrent appends", () => {
  it("keeps every entry when appends are dispatched together", async () => {
    const entries = Array.from({ length: 12 }, (_, i) => entry(i));
    await Promise.all(entries.map((e) => appendLogEntries([e])));

    const stored = await readLogEntries();
    expect(stored).toHaveLength(12);
    for (const e of entries) expect(stored).toContainEqual(e);
  });

  it("leaves no temp files behind", async () => {
    await Promise.all([
      appendLogEntries([entry(1)]),
      appendLogEntries([entry(2)]),
      appendLogEntries([entry(3)]),
    ]);
    const leftovers = readdirSync(dataDir).filter((f) => f !== "logs.json");
    expect(leftovers).toEqual([]);
  });
});
