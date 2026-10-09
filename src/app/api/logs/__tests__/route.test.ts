import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MAX_LOGS_BYTES } from "@/src/features/logs/types";
import { DELETE, GET, POST } from "../route";

let dataDir: string;
let tempDirs: string[];

beforeEach(() => {
  tempDirs = [];
  delete process.env.LOGS_DATA_DIR;
  dataDir = mkdtempSync(path.join(tmpdir(), "logs-route-"));
  tempDirs.push(dataDir);
  process.env.LOGS_DATA_DIR = dataDir;
});

afterEach(() => {
  delete process.env.LOGS_DATA_DIR;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

/** Builds a web `Request` that the route handlers accept as a `NextRequest`. */
function postRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/logs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

async function callPost(body: unknown): Promise<Response> {
  return POST(postRequest(body), {} as never) as Promise<Response>;
}

describe("POST /api/logs", () => {
  it("stores a valid batch and returns 200 { stored, dropped }", async () => {
    const response = await callPost([
      { app: "a", type: "info", message: "hello" },
      { app: "b", type: "error", message: "boom", content: { code: 500 } },
    ]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ stored: 2, dropped: 0 });
  });

  it("rejects a missing app with 400", async () => {
    const response = await callPost([{ type: "info", message: "hi" }]);
    expect(response.status).toBe(400);
  });

  it("rejects an unknown type with 400", async () => {
    const response = await callPost([
      { app: "a", type: "trace", message: "hi" },
    ]);
    expect(response.status).toBe(400);
  });

  it("rejects an empty batch with 400", async () => {
    const response = await callPost([]);
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await callPost("{ not json");
    expect(response.status).toBe(400);
  });

  it("rejects a batch exceeding the byte cap with 413", async () => {
    const big = Array.from({ length: 200 }, () => ({
      app: "a",
      type: "info",
      message: "x".repeat(10_000),
    }));
    expect(MAX_LOGS_BYTES).toBeLessThan(200 * 10_000);
    const response = await callPost(big);
    expect(response.status).toBe(413);
  });
});

describe("GET /api/logs", () => {
  it("returns 200 with a bare array", async () => {
    await callPost([{ app: "a", type: "info", message: "hello" }]);
    const response = await (GET as () => Promise<Response>)();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });

  it("returns an empty array when nothing is stored", async () => {
    const response = await (GET as () => Promise<Response>)();
    expect(await response.json()).toEqual([]);
  });
});

describe("DELETE /api/logs", () => {
  it("clears logs and reports the count", async () => {
    await callPost([
      { app: "a", type: "info", message: "one" },
      { app: "a", type: "info", message: "two" },
    ]);
    const response = await (DELETE as () => Promise<Response>)();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cleared: 2 });
  });
});
