import { describe, it, expect } from "vitest";
import { filterResponseHeaders, filterRequestHeaders, isHopByHop, buildForwardedHeaders } from "../proxy-handler";

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

  it("preserves non-standard content-type from upstream", () => {
    const upstream = {
      "content-type": "application/vnd.api+json; charset=utf-8",
      "x-request-id": "abc",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.get("content-type")).toBe("application/vnd.api+json; charset=utf-8");
  });
});

describe("filterRequestHeaders", () => {
  it("forwards standard request headers", () => {
    const headers = new Headers();
    headers.set("authorization", "Bearer token123");
    headers.set("content-type", "application/json");
    headers.set("accept", "application/json");
    headers.set("x-custom-header", "custom-value");

    const result = filterRequestHeaders(headers);

    expect(result["authorization"]).toBe("Bearer token123");
    expect(result["content-type"]).toBe("application/json");
    expect(result["accept"]).toBe("application/json");
    expect(result["x-custom-header"]).toBe("custom-value");
  });

  it("strips hop-by-hop headers", () => {
    const headers = new Headers();
    headers.set("connection", "keep-alive");
    headers.set("keep-alive", "timeout=5");
    headers.set("transfer-encoding", "chunked");
    headers.set("accept", "application/json");

    const result = filterRequestHeaders(headers);

    expect(result).not.toHaveProperty("connection");
    expect(result).not.toHaveProperty("keep-alive");
    expect(result).not.toHaveProperty("transfer-encoding");
    expect(result["accept"]).toBe("application/json");
  });

  it("strips Next.js internal headers", () => {
    const headers = new Headers();
    headers.set("x-middleware-rewrite", "/api/v1");
    headers.set("x-invoke-path", "/api/proxy");
    headers.set("next-url", "http://localhost:3000");
    headers.set("x-forwarded-for", "127.0.0.1");
    headers.set("accept", "*/*");

    const result = filterRequestHeaders(headers);

    expect(result).not.toHaveProperty("x-middleware-rewrite");
    expect(result).not.toHaveProperty("x-invoke-path");
    expect(result).not.toHaveProperty("next-url");
    expect(result).not.toHaveProperty("x-forwarded-for");
    expect(result["accept"]).toBe("*/*");
  });

  it("strips host and content-length", () => {
    const headers = new Headers();
    headers.set("host", "localhost:3000");
    headers.set("content-length", "128");
    headers.set("accept", "*/*");

    const result = filterRequestHeaders(headers);

    expect(result).not.toHaveProperty("host");
    expect(result).not.toHaveProperty("content-length");
    expect(result["accept"]).toBe("*/*");
  });
});

describe("buildForwardedHeaders", () => {
  it("sets x-forwarded-for from request ip", () => {
    const result = buildForwardedHeaders({
      ip: "203.0.113.50",
      protocol: "https",
      host: "example.com",
    });

    expect(result["x-forwarded-for"]).toBe("203.0.113.50");
    expect(result["x-forwarded-proto"]).toBe("https");
    expect(result["x-forwarded-host"]).toBe("example.com");
  });

  it("defaults ip to 'unknown' when not available", () => {
    const result = buildForwardedHeaders({
      ip: undefined,
      protocol: "http",
      host: "localhost:3000",
    });

    expect(result["x-forwarded-for"]).toBe("unknown");
    expect(result["x-forwarded-proto"]).toBe("http");
    expect(result["x-forwarded-host"]).toBe("localhost:3000");
  });
});
