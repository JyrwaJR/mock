import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_LOGS_BYTES, type LogEntry } from "@/src/features/logs/types";
import { BadRequestError, PayloadTooLargeError } from "@/src/shared/errors/http-errors";
import {
  applyLogFilters,
  clearLogs,
  listLogs,
  parseLogFilters,
  toLogEntry,
  writeLogs,
  type LogFilters,
} from "../logs";
import { readLogEntries } from "../store";

/** Builds a full stored entry, overriding any field. */
function sample(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    app: "a",
    type: "info",
    message: "msg",
    timestamp: "2026-10-09T12:00:00.000Z",
    ...overrides,
  };
}

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

describe("applyLogFilters", () => {
  it("sorts newest-first by timestamp", () => {
    const older = sample({ message: "older", timestamp: "2026-10-09T10:00:00.000Z" });
    const newer = sample({ message: "newer", timestamp: "2026-10-09T12:00:00.000Z" });
    expect(applyLogFilters([older, newer], {}).map((e) => e.message)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("is stable for equal timestamps", () => {
    const a = sample({ message: "a" });
    const b = sample({ message: "b" });
    const c = sample({ message: "c" });
    expect(applyLogFilters([a, b, c], {}).map((e) => e.message)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("orders by instant, not by string, across timezone offsets", () => {
    const utc = sample({ message: "utc", timestamp: "2026-10-09T21:00:00.000Z" });
    // 2026-10-10T01:30:00+05:30 is the instant 2026-10-09T20:00:00Z — older than the UTC one.
    const offset = sample({
      message: "offset",
      timestamp: "2026-10-10T01:30:00.000+05:30",
    });
    expect(applyLogFilters([offset, utc], {}).map((e) => e.message)).toEqual([
      "utc",
      "offset",
    ]);
  });

  it("keeps entries at or after `from`", () => {
    const from = new Date("2026-10-10T00:00:00.000Z");
    const before = sample({ message: "before", timestamp: "2026-10-09T23:59:59.999Z" });
    const at = sample({ message: "at", timestamp: "2026-10-10T00:00:00.000Z" });
    const after = sample({ message: "after", timestamp: "2026-10-10T00:00:00.001Z" });
    expect(applyLogFilters([before, at, after], { from }).map((e) => e.message)).toEqual([
      "after",
      "at",
    ]);
  });

  it("keeps entries at or before `to`", () => {
    const to = new Date("2026-10-09T23:59:59.999Z");
    const before = sample({ message: "before", timestamp: "2026-10-09T23:59:59.998Z" });
    const at = sample({ message: "at", timestamp: "2026-10-09T23:59:59.999Z" });
    const after = sample({ message: "after", timestamp: "2026-10-10T00:00:00.000Z" });
    expect(applyLogFilters([after, at, before], { to }).map((e) => e.message)).toEqual([
      "at",
      "before",
    ]);
  });

  it("applies from and to inclusively together", () => {
    const from = new Date("2026-10-09T00:00:00.000Z");
    const to = new Date("2026-10-09T23:59:59.999Z");
    const inDay = sample({ message: "in", timestamp: "2026-10-09T12:00:00.000Z" });
    const before = sample({ message: "out-before", timestamp: "2026-10-08T23:59:59.999Z" });
    const after = sample({ message: "out-after", timestamp: "2026-10-10T00:00:00.000Z" });
    expect(applyLogFilters([after, inDay, before], { from, to }).map((e) => e.message)).toEqual([
      "in",
    ]);
  });

  it("keeps entries whose type is in the OR list", () => {
    const error = sample({ type: "error", message: "e" });
    const warn = sample({ type: "warn", message: "w" });
    const info = sample({ type: "info", message: "i" });
    const result = applyLogFilters([info, warn, error], { types: ["error", "warn"] });
    expect(result.map((e) => e.message)).toEqual(["w", "e"]);
  });

  it("matches message with a case-insensitive substring", () => {
    const upper = sample({ message: "Request TIMEOUT" });
    const lower = sample({ message: "timeout after retry" });
    const other = sample({ message: "all good" });
    const result = applyLogFilters([other, lower, upper], { q: "Timeout" });
    expect(result.map((e) => e.message)).toEqual(["timeout after retry", "Request TIMEOUT"]);
  });

  it("combines filters with AND", () => {
    const match = sample({
      type: "error",
      message: "boom: DB DOWN",
      timestamp: "2026-10-09T12:00:00.000Z",
    });
    const wrongType = sample({
      type: "info",
      message: "boom: DB DOWN",
      timestamp: "2026-10-09T13:00:00.000Z",
    });
    const noQ = sample({
      type: "error",
      message: "all good",
      timestamp: "2026-10-09T14:00:00.000Z",
    });
    const outside = sample({
      type: "error",
      message: "boom: DB DOWN",
      timestamp: "2026-10-08T12:00:00.000Z",
    });
    const filters: LogFilters = {
      types: ["error"],
      q: "boom",
      from: new Date("2026-10-09T00:00:00.000Z"),
      to: new Date("2026-10-09T23:59:59.999Z"),
    };
    expect(applyLogFilters([outside, noQ, wrongType, match], filters).map((e) => e.message)).toEqual(
      ["boom: DB DOWN"],
    );
  });

  it("sinks unparseable timestamps to the end of the sorted result", () => {
    const bad = sample({ message: "bad", timestamp: "not-a-date" });
    const newer = sample({ message: "newer", timestamp: "2026-10-09T12:00:00.000Z" });
    const older = sample({ message: "older", timestamp: "2026-10-09T10:00:00.000Z" });
    expect(applyLogFilters([bad, newer, older], {}).map((e) => e.message)).toEqual([
      "newer",
      "older",
      "bad",
    ]);
  });

  it("excludes unparseable timestamps when a range filter is set", () => {
    const bad = sample({ message: "bad", timestamp: "not-a-date" });
    const good = sample({ message: "good", timestamp: "2026-10-09T12:00:00.000Z" });
    expect(
      applyLogFilters([bad, good], { from: new Date("2026-10-09T00:00:00.000Z") }).map(
        (e) => e.message,
      ),
    ).toEqual(["good"]);
  });
});

describe("parseLogFilters", () => {
  it("returns empty filters when no params are present", () => {
    expect(parseLogFilters(new URLSearchParams())).toEqual({});
  });

  it("parses a date-only `from` as UTC midnight", () => {
    expect(parseLogFilters(new URLSearchParams("from=2026-10-09"))).toEqual({
      from: new Date("2026-10-09T00:00:00.000Z"),
    });
  });

  it("parses a date-only `to` as UTC end of day", () => {
    expect(parseLogFilters(new URLSearchParams("to=2026-10-09"))).toEqual({
      to: new Date("2026-10-09T23:59:59.999Z"),
    });
  });

  it("parses full ISO instants", () => {
    expect(parseLogFilters(new URLSearchParams("from=2026-10-09T12:00:00.000Z"))).toEqual({
      from: new Date("2026-10-09T12:00:00.000Z"),
    });
  });

  it("collects repeated type params in order", () => {
    expect(parseLogFilters(new URLSearchParams("type=error&type=warn"))).toEqual({
      types: ["error", "warn"],
    });
  });

  it("omits an empty q", () => {
    expect(parseLogFilters(new URLSearchParams("q="))).toEqual({});
  });

  it("throws BadRequestError for an invalid type", () => {
    expect(() => parseLogFilters(new URLSearchParams("type=trace"))).toThrow(BadRequestError);
  });

  it("throws BadRequestError for an unparseable from", () => {
    expect(() => parseLogFilters(new URLSearchParams("from=banana"))).toThrow(BadRequestError);
  });

  it("throws BadRequestError when from is after to", () => {
    expect(() => parseLogFilters(new URLSearchParams("from=2026-10-10&to=2026-10-09"))).toThrow(
      BadRequestError,
    );
  });
});
