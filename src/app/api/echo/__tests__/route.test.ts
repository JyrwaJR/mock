import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DELETE, GET } from "../route";
import { lookup, register } from "@/src/features/echo/services/echo";
import { resetStore } from "@/src/features/echo/services/store";
import { NotFoundError } from "@/src/shared/errors/http-errors/http-errors";

/** Temp directory backing `ECHO_REGISTRY_FILE` for the current test. */
let tempDir: string;
/** Prior `ECHO_REGISTRY_FILE` value, restored after each test. */
let previousRegistryFile: string | undefined;

beforeEach(() => {
  previousRegistryFile = process.env.ECHO_REGISTRY_FILE;
  tempDir = mkdtempSync(path.join(tmpdir(), "echo-registry-"));
  // Point persistence at a throwaway file so the dev registry is never touched.
  process.env.ECHO_REGISTRY_FILE = path.join(tempDir, "registry.json");
  resetStore();
});

afterEach(() => {
  resetStore();
  if (previousRegistryFile === undefined) {
    delete process.env.ECHO_REGISTRY_FILE;
  } else {
    process.env.ECHO_REGISTRY_FILE = previousRegistryFile;
  }
  rmSync(tempDir, { recursive: true, force: true });
});

describe("DELETE /api/echo", () => {
  it("responds with 200 OK", async () => {
    register({ url: "/articles/1", data: { title: "Hello" } });

    const response = await DELETE();

    expect(response.status).toBe(200);
  });

  it("returns a JSON content type", async () => {
    const response = await DELETE();

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("clears every registered entry", async () => {
    register({ url: "/articles/1", data: { title: "Hello" } });
    register({ url: "/healthz", data: { status: "ok" } });

    await DELETE();

    const body = await (await GET()).json();
    expect(body).toEqual({});
  });

  it("reports how many entries were cleared", async () => {
    register({ url: "/articles/1", data: { title: "Hello" } });
    register({ url: "/healthz", data: { status: "ok" } });
    register({ data: { fallback: true } });

    const response = await DELETE();

    expect(await response.json()).toEqual({ cleared: 3 });
  });

  it("removes the persisted registry file", async () => {
    register({ url: "/articles/1", data: { title: "Hello" } });
    expect(
      existsSync(path.join(tempDir, "registry.json")),
      "registry file should exist before the delete",
    ).toBe(true);

    await DELETE();

    expect(existsSync(path.join(tempDir, "registry.json"))).toBe(false);
  });

  it("clears the default fallback entry", async () => {
    register({ data: { fallback: true } });

    await DELETE();

    expect(() => lookup(["missing"])).toThrow(NotFoundError);
  });

  it("is idempotent on an already empty registry", async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cleared: 0 });
  });

  it("leaves the registry empty for entries registered after the clear", async () => {
    register({ url: "/articles/1", data: { title: "Hello" } });
    await DELETE();

    register({ url: "/healthz", data: { status: "ok" } });

    expect(await (await GET()).json()).toEqual({
      "/healthz": { data: { status: "ok" } },
    });
  });
});
