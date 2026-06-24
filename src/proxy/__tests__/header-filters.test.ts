import { describe, it, expect } from "vitest";
import { filterResponseHeaders } from "../proxy-handler";

describe("filterResponseHeaders", () => {
  it("strips content-length to avoid mismatch after decompression", () => {
    const upstream = {
      "content-type": "application/json",
      "content-length": "42",
      "x-request-id": "abc-123",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.has("content-length")).toBe(false);
    expect(result.get("content-type")).toBe("application/json");
    expect(result.get("x-request-id")).toBe("abc-123");
  });

  it("strips hop-by-hop headers", () => {
    const upstream = {
      "transfer-encoding": "chunked",
      connection: "keep-alive",
      "keep-alive": "timeout=5",
      upgrade: "websocket",
      "proxy-authorization": "Basic abc",
      "x-custom": "preserved",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.has("transfer-encoding")).toBe(false);
    expect(result.has("connection")).toBe(false);
    expect(result.has("keep-alive")).toBe(false);
    expect(result.has("upgrade")).toBe(false);
    expect(result.has("proxy-authorization")).toBe(false);
    expect(result.get("x-custom")).toBe("preserved");
  });

  it("strips content-encoding", () => {
    const upstream = {
      "content-encoding": "gzip",
      "x-custom": "preserved",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.has("content-encoding")).toBe(false);
    expect(result.get("x-custom")).toBe("preserved");
  });

  it("handles set-cookie arrays with append (not join)", () => {
    const upstream = {
      "set-cookie": ["session=abc; Path=/", "theme=dark; Path=/"],
    };

    const result = filterResponseHeaders(upstream);

    const cookies = result.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies).toContain("session=abc; Path=/");
    expect(cookies).toContain("theme=dark; Path=/");
  });

  it("joins non-cookie array values with comma", () => {
    const upstream = {
      "cache-control": ["no-cache", "no-store"],
    };

    const result = filterResponseHeaders(upstream);

    expect(result.get("cache-control")).toBe("no-cache, no-store");
  });

  it("converts number and boolean values to strings", () => {
    const upstream = {
      "x-ratelimit-remaining": 42,
      "x-feature-enabled": true,
    } as Record<string, unknown>;

    const result = filterResponseHeaders(upstream);

    expect(result.get("x-ratelimit-remaining")).toBe("42");
    expect(result.get("x-feature-enabled")).toBe("true");
  });
});
