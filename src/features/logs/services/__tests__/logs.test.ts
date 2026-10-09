import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_LOGS_BYTES } from "@/src/features/logs/types";
import { PayloadTooLargeError } from "@/src/shared/errors/http-errors";
import { clearLogs, listLogs, toLogEntry, writeLogs } from "../logs";
import { readLogEntries } from "../store";

let dataDir: string;
let tempDirs: string[];

beforeEach(() => {
  tempDirs = [];
  delete process.env.LOGS_DATA_DIR;
  dataDir = mkdtempSync(path.join(tmpdir(), "logs-service-"));
  tempDirs.push(dataDir);
  process.env.LOGS_DATA_DIR = dataDir;
});

afterEach(() => {
  delete process.env.LOGS_DATA_DIR;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

describe("toLogEntry", () => {
  it("stamps a timestamp when the input omits one", () => {
    const now = new Date("2026-10-09T00:00:00.000Z");
    const result = toLogEntry({ app: "a", type: "info", message: "hi" }, now);
    expect(result.timestamp).toBe("2026-10-09T00:00:00.000Z");
  });

  it("preserves a client-supplied timestamp", () => {
    const result = toLogEntry({
      app: "a",
      type: "warn",
      message: "hi",
      timestamp: "2026-01-02T03:04:05.000Z",
    });
    expect(result.timestamp).toBe("2026-01-02T03:04:05.000Z");
  });

  it("does not add a content key when none was provided", () => {
    const result = toLogEntry({ app: "a", type: "info", message: "hi" });
    expect(Object.hasOwn(result, "content")).toBe(false);
  });
});

describe("writeLogs", () => {
  it("stores a batch and reports the count", async () => {
    const response = await writeLogs([
      { app: "a", type: "info", message: "one" },
      { app: "b", type: "error", message: "two" },
    ]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ stored: 2, dropped: 0 });
    expect(await readLogEntries()).toHaveLength(2);
  });

  it("rejects a batch larger than MAX_LOGS_BYTES with 413", async () => {
    const huge = [
      {
        app: "a",
        type: "info" as const,
        message: "x".repeat(MAX_LOGS_BYTES + 1),
      },
    ];
    await expect(writeLogs(huge)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });
});

describe("listLogs / clearLogs", () => {
  it("lists a bare array", async () => {
    await writeLogs([{ app: "a", type: "info", message: "one" }]);
    const response = await listLogs();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });

  it("clears and reports the count", async () => {
    await writeLogs([
      { app: "a", type: "info", message: "one" },
      { app: "a", type: "info", message: "two" },
    ]);
    const response = await clearLogs();
    expect(await response.json()).toEqual({ cleared: 2 });
  });
});
