# Proxy Header Mirroring Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all header mirroring bugs in `src/proxy/proxy-handler.ts` so headers pass through faithfully between client ↔ proxy ↔ upstream, with no silent corruption.

**Architecture:** The proxy handler uses Axios to forward incoming Next.js requests to an upstream target. We fix four bugs: (1) response `content-length` mismatch after Axios auto-decompression, (2) `NextResponse.json()` overwriting the upstream's `content-type`, (3) missing `x-forwarded-*` headers on outbound requests, and (4) Axios `responseType` defaulting to `json` which corrupts binary responses. All fixes are in a single file with pure-function helpers that are unit-testable without mocking Next.js or Axios internals.

**Tech Stack:** TypeScript, Next.js 16 (App Router), Axios 1.x, Vitest (new — needs setup)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/proxy/proxy-handler.ts` | Modify | Apply all four fixes to the existing proxy handler |
| `src/proxy/__tests__/header-filters.test.ts` | Create | Unit tests for the two pure filter functions and the new `buildForwardedHeaders` helper |
| `vitest.config.ts` | Create | Vitest configuration for the project |
| `package.json` | Modify | Add `vitest` dev dependency and `test` script |

---

## Task 0: Set Up Vitest

The project has no test framework. We need Vitest before we can TDD the fixes.

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add devDependency + script)

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts` at the project root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

The `@` alias mirrors the existing `tsconfig.json` path mapping (`"@/*": ["./*"]`).

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to the `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest runs (no tests yet, should exit cleanly)**

```bash
npm test
```

Expected: Vitest exits with "No test files found" or 0 tests passed — no crash.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test framework"
```

---

## Task 1: Fix `filterResponseHeaders` — Strip `content-length`

When Axios auto-decompresses a gzip/brotli response, the response body (`response.data`) is decompressed, but the original `content-length` header still reflects the **compressed** byte count. Forwarding this header causes the client to truncate or error because the body is larger than the header claims.

**Fix:** Strip `content-length` alongside `content-encoding` in `filterResponseHeaders`.

**Files:**
- Create: `src/proxy/__tests__/header-filters.test.ts`
- Modify: `src/proxy/proxy-handler.ts:47-69` — `filterResponseHeaders`

- [ ] **Step 1: Export the filter functions for testability**

In `src/proxy/proxy-handler.ts`, change the two filter functions and the `isHopByHop` helper from bare `function` declarations to **named exports** so tests can import them. The `handler` function stays as a non-default named export (already is).

At line 18, change:
```ts
function isHopByHop(key: string): boolean {
```
to:
```ts
export function isHopByHop(key: string): boolean {
```

At line 31, change:
```ts
function filterRequestHeaders(headers: Headers): Record<string, string> {
```
to:
```ts
export function filterRequestHeaders(headers: Headers): Record<string, string> {
```

At line 47, change:
```ts
function filterResponseHeaders(rawHeaders: Record<string, unknown>): Headers {
```
to:
```ts
export function filterResponseHeaders(rawHeaders: Record<string, unknown>): Headers {
```

These are helper functions — adding `export` has no side effects on the route handler.

- [ ] **Step 2: Write the failing test for content-length stripping**

Create `src/proxy/__tests__/header-filters.test.ts`:

```ts
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
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: FAIL — `content-length` is currently **not** stripped, so `result.has("content-length")` returns `true`.

- [ ] **Step 4: Fix `filterResponseHeaders` to strip `content-length`**

In `src/proxy/proxy-handler.ts`, change line 51 from:

```ts
    if (isHopByHop(lower) || lower === "content-encoding") {
```

to:

```ts
    if (isHopByHop(lower) || lower === "content-encoding" || lower === "content-length") {
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/proxy/proxy-handler.ts src/proxy/__tests__/header-filters.test.ts
git commit -m "fix: strip content-length from proxied response to prevent decompression mismatch"
```

---

## Task 2: Add remaining `filterResponseHeaders` test coverage

Before moving to the next fix, add tests that document the existing correct behaviors so we don't regress them in later tasks.

**Files:**
- Modify: `src/proxy/__tests__/header-filters.test.ts`

- [ ] **Step 1: Add tests for hop-by-hop stripping and content-encoding stripping**

Append to the `describe("filterResponseHeaders", ...)` block in `src/proxy/__tests__/header-filters.test.ts`:

```ts
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
```

- [ ] **Step 2: Run all tests to verify they pass**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: All tests PASS (these test existing correct behavior).

- [ ] **Step 3: Commit**

```bash
git add src/proxy/__tests__/header-filters.test.ts
git commit -m "test: add comprehensive filterResponseHeaders coverage"
```

---

## Task 3: Add `filterRequestHeaders` test coverage

**Files:**
- Modify: `src/proxy/__tests__/header-filters.test.ts`

- [ ] **Step 1: Add tests for request header filtering**

Add a new `describe` block to `src/proxy/__tests__/header-filters.test.ts`. Also update the import at the top of the file to include all three exports:

```ts
import { filterResponseHeaders, filterRequestHeaders, isHopByHop } from "../proxy-handler";
```

Then add the new describe block:

```ts
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
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/proxy/__tests__/header-filters.test.ts
git commit -m "test: add filterRequestHeaders coverage"
```

---

## Task 4: Fix `NextResponse.json()` Overwriting Upstream `content-type`

`NextResponse.json()` internally calls `JSON.stringify()` on the data and forces the `content-type` to `application/json`. If the upstream returned `application/vnd.api+json`, `application/json; charset=utf-8`, or any other variant, it gets silently replaced.

**Fix:** Use `new NextResponse(JSON.stringify(response.data), ...)` instead, so the `content-type` from `responseHeaders` is preserved.

**Files:**
- Modify: `src/proxy/proxy-handler.ts:97-105` — the handler's return block
- Modify: `src/proxy/__tests__/header-filters.test.ts` — add regression test

- [ ] **Step 1: Write a test confirming the filter preserves non-standard content-type**

This confirms the filter itself is correct — the bug is only in the `NextResponse.json()` call.

Add to the `describe("filterResponseHeaders", ...)` block in `src/proxy/__tests__/header-filters.test.ts`:

```ts
  it("preserves non-standard content-type from upstream", () => {
    const upstream = {
      "content-type": "application/vnd.api+json; charset=utf-8",
      "x-request-id": "abc",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.get("content-type")).toBe("application/vnd.api+json; charset=utf-8");
  });
```

- [ ] **Step 2: Run the test to verify it passes (the filter is correct; the bug is in the handler)**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: PASS — confirming the filter preserves content-type fine. The bug is that `NextResponse.json()` replaces it after filtering.

- [ ] **Step 3: Replace `NextResponse.json()` with `new NextResponse()`**

In `src/proxy/proxy-handler.ts`, replace lines 97–104 (the entire return block) with:

```ts
  const responseBody =
    typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data);

  return new NextResponse(responseBody, { status, headers: responseHeaders });
```

This change:
- Removes the `if/else` split between string and JSON paths
- Uses `JSON.stringify` manually for non-string data (same as what `NextResponse.json()` does internally)
- Passes `responseHeaders` directly — which already includes the upstream's `content-type`
- The HTTP layer calculates `content-length` from the actual body string automatically

- [ ] **Step 4: Verify the app still compiles**

```bash
npx next build 2>&1 | head -30
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/proxy/proxy-handler.ts src/proxy/__tests__/header-filters.test.ts
git commit -m "fix: preserve upstream content-type by avoiding NextResponse.json()"
```

---

## Task 5: Add `x-forwarded-*` Headers to Outbound Requests

Currently `isNextJsInternal` strips all `x-forwarded-*` headers (line 27), so the upstream server never receives `X-Forwarded-For`, `X-Forwarded-Host`, or `X-Forwarded-Proto`. A proper reverse proxy should set these based on the incoming request so the upstream can see the real client IP and protocol.

**Fix:** After filtering, explicitly add the three standard forwarded headers to the outbound request based on the incoming `NextRequest`.

**Files:**
- Modify: `src/proxy/proxy-handler.ts` — add `buildForwardedHeaders` helper, update `handler`
- Modify: `src/proxy/__tests__/header-filters.test.ts` — add tests for `buildForwardedHeaders`

- [ ] **Step 1: Write the failing test for `buildForwardedHeaders`**

Update the import at the top of `src/proxy/__tests__/header-filters.test.ts`:

```ts
import {
  filterResponseHeaders,
  filterRequestHeaders,
  isHopByHop,
  buildForwardedHeaders,
} from "../proxy-handler";
```

Then add a new describe block:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: FAIL — `buildForwardedHeaders` does not exist yet.

- [ ] **Step 3: Implement `buildForwardedHeaders`**

Add this new exported function to `src/proxy/proxy-handler.ts`, after the `filterRequestHeaders` function (after line 45):

```ts
export function buildForwardedHeaders(info: {
  ip: string | undefined;
  protocol: string;
  host: string;
}): Record<string, string> {
  return {
    "x-forwarded-for": info.ip ?? "unknown",
    "x-forwarded-proto": info.protocol,
    "x-forwarded-host": info.host,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: PASS

- [ ] **Step 5: Wire `buildForwardedHeaders` into the `handler` function**

In the `handler` function, change the axios call from:

```ts
  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: filterRequestHeaders(request.headers),
    validateStatus: () => true,
  });
```

to:

```ts
  const forwardedHeaders = buildForwardedHeaders({
    ip: request.ip,
    protocol: request.nextUrl.protocol.replace(":", ""),
    host: request.headers.get("host") ?? request.nextUrl.host,
  });

  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: {
      ...filterRequestHeaders(request.headers),
      ...forwardedHeaders,
    },
    validateStatus: () => true,
  });
```

`request.nextUrl.protocol` includes a trailing colon (e.g. `"https:"`) so we strip it with `.replace(":", "")`.

- [ ] **Step 6: Run all tests**

```bash
npx vitest run src/proxy/__tests__/header-filters.test.ts
```

Expected: All PASS.

- [ ] **Step 7: Commit**

```bash
git add src/proxy/proxy-handler.ts src/proxy/__tests__/header-filters.test.ts
git commit -m "fix: add x-forwarded-for/proto/host to outbound proxy requests"
```

---

## Task 6: Set Axios `responseType` to `"arraybuffer"` for Binary Safety

Axios defaults to `responseType: "json"`, which eagerly parses the response body as JSON. For binary responses (images, PDFs, protobuf), this corrupts the data silently. Using `"arraybuffer"` gives us the raw bytes and we control serialization ourselves.

**Changing `responseType` changes the type of `response.data`** — it becomes a `Buffer` (Node.js ArrayBuffer), not a parsed object or string. The response-building logic must be updated to handle this.

**Files:**
- Modify: `src/proxy/proxy-handler.ts` — change axios config + response building

- [ ] **Step 1: Update the axios call to use `responseType: "arraybuffer"`**

In the `handler` function in `src/proxy/proxy-handler.ts`, add `responseType` to the axios config:

```ts
  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: {
      ...filterRequestHeaders(request.headers),
      ...forwardedHeaders,
    },
    responseType: "arraybuffer",
    validateStatus: () => true,
  });
```

- [ ] **Step 2: Update the response building to handle ArrayBuffer**

Replace the response-building block (the `const responseBody = ...` and `return new NextResponse(...)` lines from Task 4) with:

```ts
  return new NextResponse(response.data as Buffer, {
    status,
    headers: responseHeaders,
  });
```

With `responseType: "arraybuffer"`, `response.data` is a `Buffer` containing the raw (decompressed) bytes. Passing it directly to `NextResponse` handles all content types — JSON, HTML, images, binary — without any re-encoding. The upstream's `content-type` header (preserved by `filterResponseHeaders`) tells the client how to interpret the bytes.

This also removes the need for the string-check and `JSON.stringify` logic from Task 4 — the raw bytes are always the correct body to forward.

- [ ] **Step 3: Verify the app compiles**

```bash
npx next build 2>&1 | head -30
```

Expected: Build succeeds.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/proxy/proxy-handler.ts
git commit -m "fix: use arraybuffer responseType for binary-safe proxying"
```

---

## Task 7: Final Verification — Review the Complete File

Verify the final state of `proxy-handler.ts` matches expectations.

**Files:**
- Review: `src/proxy/proxy-handler.ts`

- [ ] **Step 1: Review the final file**

The final `src/proxy/proxy-handler.ts` should look like this:

```ts
import axios from "axios";
import https from "https";
import { NextRequest, NextResponse } from "next/server";

const TARGET_BASE_URL = process.env.TARGET_BASE_URL ?? "http://localhost:3000";

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0",
});

const HOP_BY_HOP = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
]);

export function isHopByHop(key: string): boolean {
  return HOP_BY_HOP.has(key) || key.startsWith("proxy-");
}

function isNextJsInternal(key: string): boolean {
  return (
    key.startsWith("x-middleware-") ||
    key === "next-url" ||
    key.startsWith("x-invoke-") ||
    key.startsWith("x-forwarded-")
  );
}

export function filterRequestHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      !isHopByHop(lower) &&
      !isNextJsInternal(lower) &&
      lower !== "content-length" &&
      lower !== "host"
    ) {
      result[key] = value;
    }
  });
  return result;
}

export function buildForwardedHeaders(info: {
  ip: string | undefined;
  protocol: string;
  host: string;
}): Record<string, string> {
  return {
    "x-forwarded-for": info.ip ?? "unknown",
    "x-forwarded-proto": info.protocol,
    "x-forwarded-host": info.host,
  };
}

export function filterResponseHeaders(rawHeaders: Record<string, unknown>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    const lower = key.toLowerCase();
    if (isHopByHop(lower) || lower === "content-encoding" || lower === "content-length") {
      continue;
    }
    if (Array.isArray(value)) {
      if (lower === "set-cookie") {
        for (const cookie of value) {
          headers.append("set-cookie", String(cookie));
        }
      } else {
        headers.set(key, value.map(String).join(", "));
      }
    } else if (typeof value === "string") {
      headers.set(key, value);
    } else if (typeof value === "number" || typeof value === "boolean") {
      headers.set(key, String(value));
    }
  }
  return headers;
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path = [] } = await params;

  const targetUrl =
    `${TARGET_BASE_URL}/${path.join("/")}` + (request.nextUrl.search || "");

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const forwardedHeaders = buildForwardedHeaders({
    ip: request.ip,
    protocol: request.nextUrl.protocol.replace(":", ""),
    host: request.headers.get("host") ?? request.nextUrl.host,
  });

  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: {
      ...filterRequestHeaders(request.headers),
      ...forwardedHeaders,
    },
    responseType: "arraybuffer",
    validateStatus: () => true,
  });

  const { status } = response;
  const responseHeaders = filterResponseHeaders(response.headers);

  return new NextResponse(response.data as Buffer, {
    status,
    headers: responseHeaders,
  });
}

export { handler };
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Run the build one final time**

```bash
npx next build 2>&1 | head -30
```

Expected: Build succeeds.

- [ ] **Step 4: Final commit (if any review adjustments were needed)**

```bash
git add -A
git commit -m "chore: final review pass on proxy header mirroring fixes"
```

---

## Summary of All Fixes

| Bug | Root Cause | Fix | Task |
|-----|-----------|-----|------|
| Response `content-length` mismatch | Axios decompresses body but original compressed `content-length` is forwarded | Strip `content-length` in `filterResponseHeaders` | Task 1 |
| Upstream `content-type` overwritten | `NextResponse.json()` forces `application/json` | Use `new NextResponse(body, ...)` instead | Task 4 |
| Missing `x-forwarded-*` on outbound | `isNextJsInternal` strips them, nothing re-adds them | New `buildForwardedHeaders` helper | Task 5 |
| Binary responses corrupted | Axios `responseType` defaults to `"json"` | Set `responseType: "arraybuffer"` | Task 6 |
