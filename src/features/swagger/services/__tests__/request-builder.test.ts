import { describe, it, expect } from "vitest";
import {
  API_KEY_HEADER,
  buildProxyHeaders,
  buildTargetUrl,
  sanitizePathSegments,
} from "../request-builder";

describe("sanitizePathSegments", () => {
  it("joins simple segments", () => {
    expect(sanitizePathSegments(["pensioners", "123"])).toBe(
      "pensioners/123",
    );
  });

  it("strips leading/trailing slashes and empty segments", () => {
    expect(sanitizePathSegments(["", "/pensioners/", "123/"])).toBe(
      "pensioners/123",
    );
  });

  it("drops traversal segments", () => {
    expect(
      sanitizePathSegments(["..", "pensioners", "..", "secret"]),
    ).toBe("pensioners/secret");
  });

  it("decodes URL-encoded traversal before rejecting", () => {
    expect(sanitizePathSegments(["%2e%2e", "etc"])).toBe("etc");
  });

  it("drops segments containing slashes or double dots", () => {
    expect(sanitizePathSegments(["a/b", "c..d"])).toBe("");
  });
});

describe("buildTargetUrl", () => {
  it("preserves the base URL pathname prefix", () => {
    const url = buildTargetUrl(
      "https://api.example.com/v1",
      ["pensioners"],
      new URLSearchParams(),
    );
    expect(url.toString()).toBe("https://api.example.com/v1/pensioners");
  });

  it("forwards query params", () => {
    const url = buildTargetUrl(
      "https://api.example.com",
      ["p"],
      new URLSearchParams("a=1&b=two"),
    );
    expect(url.search).toBe("?a=1&b=two");
  });

  it("strips userinfo from the base URL", () => {
    const url = buildTargetUrl(
      "https://user:pass@api.example.com",
      ["p"],
      new URLSearchParams(),
    );
    expect(url.username).toBe("");
    expect(url.password).toBe("");
  });
});

describe("buildProxyHeaders", () => {
  it("forwards allowlisted headers only", () => {
    const incoming = new Headers({
      authorization: "Bearer abc",
      accept: "application/json",
      cookie: "sid=1",
      host: "localhost",
    });
    const headers = buildProxyHeaders(incoming, undefined);
    expect(headers.get("authorization")).toBe("Bearer abc");
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("host")).toBeNull();
  });

  it("injects the API key when configured", () => {
    const headers = buildProxyHeaders(new Headers(), "secret-key");
    expect(headers.get(API_KEY_HEADER)).toBe("secret-key");
  });

  it("omits the API key header when not configured", () => {
    const headers = buildProxyHeaders(new Headers(), undefined);
    expect(headers.has(API_KEY_HEADER)).toBe(false);
  });
});