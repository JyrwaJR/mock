import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getOpenApiSpec } from "../spec-fetcher";

const SWAGGER_KEYS = ["SWAGGER_API_URL", "SWAGGER_BASE_URL", "SWAGGER_API_KEY"];

beforeEach(() => {
  for (const key of SWAGGER_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of SWAGGER_KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

describe("getOpenApiSpec env errors", () => {
  it("throws a friendly message when SWAGGER_API_URL is missing", async () => {
    await expect(getOpenApiSpec()).rejects.toThrow(
      /SWAGGER_API_URL is not configured/,
    );
  });

  it("surfaces the real reason when SWAGGER_API_URL is invalid", async () => {
    process.env.SWAGGER_API_URL = "/doc";
    await expect(getOpenApiSpec()).rejects.toThrow(/Invalid SWAGGER_API_URL/);
  });

  it("does not attempt a fetch on invalid env", async () => {
    process.env.SWAGGER_API_URL = "/doc";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await getOpenApiSpec().catch(() => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});