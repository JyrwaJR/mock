import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, GET } from "../route";

/**
 * A route handler invoked with no arguments, matching the zero-argument style
 * of the health route test. The handlers here are wrapped in `handleErrors`,
 * whose returned signature keeps the `(request, context)` parameters even
 * though both are ignored at runtime, so the cast only relaxes arity — the
 * call itself still passes nothing.
 */
type ZeroArgHandler = () => Promise<Response>;

const getPayloads = GET as ZeroArgHandler;
const deletePayloads = DELETE as ZeroArgHandler;

let dataDir: string;
let tempDirs: string[];

/**
 * Creates a throwaway directory outside the repo and registers it for cleanup
 * so every test in this file reads and writes only its own payload store.
 */
function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "echo-payload-route-"));
  tempDirs.push(dir);
  return dir;
}

/**
 * Writes a payload registry straight to the temp store so these route tests
 * stay focused on HTTP shape rather than re-testing the store service.
 */
function seedPayloads(registry: Record<string, unknown>): void {
  writeFileSync(
    path.join(dataDir, "payload.json"),
    JSON.stringify(registry, null, 2),
    "utf8",
  );
}

beforeEach(() => {
  tempDirs = [];
  delete process.env.PAYLOAD_DATA_DIR;
  dataDir = makeTempDir();
  process.env.PAYLOAD_DATA_DIR = dataDir;
});

afterEach(() => {
  delete process.env.PAYLOAD_DATA_DIR;
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("GET /api/echo/payload", () => {
  it("responds with 200 OK", async () => {
    const response = await getPayloads();

    expect(response.status).toBe(200);
  });

  it("returns a JSON content type", async () => {
    const response = await getPayloads();

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("returns a bare record keyed by path, not a wrapping envelope", async () => {
    seedPayloads({ "/facial_registration": { status: "ok" } });

    const response = await getPayloads();
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["/facial_registration"]);
    expect(body["/facial_registration"]).toEqual({ status: "ok" });
  });

  it("returns an empty object when no store file exists", async () => {
    const response = await getPayloads();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({});
  });

  it("returns stored values with their structure intact", async () => {
    seedPayloads({
      "/facial_registration": {
        result: {
          registration_id: "reg_123",
          confidence: 0.98,
          tags: ["frontal", "smiling"],
        },
        captured_at: "2026-09-28T12:00:00.000Z",
      },
    });

    const response = await getPayloads();
    const body = await response.json();

    expect(body).toEqual({
      "/facial_registration": {
        result: {
          registration_id: "reg_123",
          confidence: 0.98,
          tags: ["frontal", "smiling"],
        },
        captured_at: "2026-09-28T12:00:00.000Z",
      },
    });
  });
});

describe("DELETE /api/echo/payload", () => {
  it("responds with 200 OK", async () => {
    const response = await deletePayloads();

    expect(response.status).toBe(200);
  });

  it("returns a JSON content type", async () => {
    const response = await deletePayloads();

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("exposes no fields beyond cleared", async () => {
    const response = await deletePayloads();
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["cleared"]);
  });

  it("reports the number of payloads that existed before the clear", async () => {
    seedPayloads({
      "/facial_registration": { status: "ok" },
      "/face_verify": { status: "ok" },
      "/liveness": { status: "ok" },
    });

    const response = await deletePayloads();
    const body = await response.json();

    expect(body.cleared).toBe(3);
  });

  it("leaves the store empty", async () => {
    seedPayloads({
      "/facial_registration": { status: "ok" },
      "/face_verify": { status: "ok" },
    });

    await deletePayloads();

    const body = await (await getPayloads()).json();

    expect(body).toEqual({});
  });

  it("is idempotent, reporting zero on a repeat clear", async () => {
    seedPayloads({ "/facial_registration": { status: "ok" } });
    await deletePayloads();

    const response = await deletePayloads();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cleared).toBe(0);
  });

  it("clears zero payloads when no store file exists", async () => {
    const response = await deletePayloads();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cleared).toBe(0);
  });
});
