import { describe, it, expect } from "vitest";
import {
  API_KEY_HEADER,
  buildProxyHeaders,
  buildTargetUrl,
  rewriteUrlToProxy,
  sanitizePathSegments,
  shouldProxyUrl,
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

describe("rewriteUrlToProxy", () => {
  it("rewrites an absolute server URL to the proxy prefix", () => {
    expect(
      rewriteUrlToProxy("http://localhost:4096/pensioners?limit=10"),
    ).toBe("/api/swagger/proxy/pensioners?limit=10");
  });

  it("maps the root path to the bare proxy prefix", () => {
    expect(rewriteUrlToProxy("http://localhost:4096/")).toBe(
      "/api/swagger/proxy",
    );
  });

  it("keeps an already-relative URL intact", () => {
    expect(rewriteUrlToProxy("/pensioners/123")).toBe(
      "/api/swagger/proxy/pensioners/123",
    );
  });

  it("strips fragments and keeps encoded query values", () => {
    expect(
      rewriteUrlToProxy("https://api.example.com/v1/users?a=two%20words#section"),
    ).toBe("/api/swagger/proxy/v1/users?a=two%20words");
  });

  it("supports a custom proxy prefix", () => {
    expect(rewriteUrlToProxy("http://h/p", "/custom/proxy")).toBe(
      "/custom/proxy/p",
    );
  });
});

describe("shouldProxyUrl", () => {
  it("skips same-origin Next API routes (spec fetch)", () => {
    expect(shouldProxyUrl("/api/swagger/spec")).toBe(false);
    expect(shouldProxyUrl("/api/anything")).toBe(false);
    expect(shouldProxyUrl("/api/swagger/proxy/greet")).toBe(false);
  });

  it("proxies absolute upstream URLs", () => {
    expect(shouldProxyUrl("http://localhost:4098/greet")).toBe(true);
    expect(shouldProxyUrl("http://upstream/api/v1/list")).toBe(true);
  });

  it("proxies relative upstream paths", () => {
    expect(shouldProxyUrl("/greet")).toBe(true);
  });
});