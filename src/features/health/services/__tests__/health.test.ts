import { describe, expect, it } from "vitest";
import { checkHealth } from "../health";

describe("checkHealth", () => {
  it("reports an ok status", () => {
    expect(checkHealth().status).toBe("ok");
  });

  it("reports process uptime as a non-negative number of seconds", () => {
    const { uptime } = checkHealth();

    expect(typeof uptime).toBe("number");
    expect(uptime).toBeGreaterThanOrEqual(0);
  });

  it("reports an ISO-8601 timestamp", () => {
    const { timestamp } = checkHealth();

    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
  });

  it("reflects the provided clock rather than the wall clock", () => {
    const fixed = new Date("2026-09-27T12:34:56.789Z");

    expect(checkHealth({ now: fixed }).timestamp).toBe("2026-09-27T12:34:56.789Z");
  });
});
