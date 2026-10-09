import { describe, expect, it } from "vitest";
import { LogEntrySchema, LogsBodySchema } from "../index";

describe("LogEntrySchema", () => {
  it("accepts a minimal valid entry", () => {
    expect(
      LogEntrySchema.safeParse({ app: "a", type: "info", message: "hi" })
        .success,
    ).toBe(true);
  });

  it("accepts an optional content value and an ISO timestamp with offset", () => {
    const result = LogEntrySchema.safeParse({
      app: "a",
      type: "warn",
      message: "hi",
      content: { userId: 1, tags: ["x"] },
      timestamp: "2026-10-09T12:00:00+05:30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown type", () => {
    expect(
      LogEntrySchema.safeParse({ app: "a", type: "trace", message: "hi" })
        .success,
    ).toBe(false);
  });

  it("rejects a blank app", () => {
    expect(
      LogEntrySchema.safeParse({ app: "   ", type: "info", message: "hi" })
        .success,
    ).toBe(false);
  });

  it("rejects an empty message", () => {
    expect(
      LogEntrySchema.safeParse({ app: "a", type: "info", message: "" })
        .success,
    ).toBe(false);
  });

  it("trims app and strips unknown keys", () => {
    const parsed = LogEntrySchema.parse({
      app: " a ",
      type: "info",
      message: "hi",
      extra: 1,
    });
    expect(parsed).toEqual({ app: "a", type: "info", message: "hi" });
  });
});

describe("LogsBodySchema", () => {
  it("accepts a non-empty array of entries", () => {
    expect(
      LogsBodySchema.safeParse([{ app: "a", type: "error", message: "boom" }])
        .success,
    ).toBe(true);
  });

  it("rejects an empty array", () => {
    expect(LogsBodySchema.safeParse([]).success).toBe(false);
  });

  it("rejects a batch larger than the entry cap", () => {
    const tooMany = Array.from({ length: 1001 }, () => ({
      app: "a",
      type: "info",
      message: "m",
    }));
    expect(LogsBodySchema.safeParse(tooMany).success).toBe(false);
  });
});
