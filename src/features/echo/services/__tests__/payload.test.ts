import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearPayloads,
  deletePayload,
  getPayload,
  normalizePayloadKey,
  payloadFilePath,
  readPayloads,
  writePayload,
} from "../payload";

const ENV_KEYS = ["PAYLOAD_DATA_DIR", "ECHO_REGISTRY_FILE"] as const;

let dataDir: string;
let tempDirs: string[];

/**
 * Creates a throwaway directory outside the repo and registers it for cleanup
 * so every test in this file reads and writes only its own store.
 */
function makeTempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "echo-payload-"));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  tempDirs = [];
  for (const key of ENV_KEYS) delete process.env[key];
  dataDir = makeTempDir();
  process.env.PAYLOAD_DATA_DIR = dataDir;
});

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
  vi.restoreAllMocks();
});

describe("normalizePayloadKey", () => {
  it("strips the /api/echo route prefix", () => {
    expect(normalizePayloadKey("/api/echo/facial_registration")).toBe(
      "/facial_registration",
    );
  });

  it("adds a leading slash to a bare slug", () => {
    expect(normalizePayloadKey("facial_registration")).toBe(
      "/facial_registration",
    );
  });

  it("collapses a trailing-slash variant to the same key as the bare path", () => {
    const withSlash = normalizePayloadKey("/facial_registration/");
    const withoutSlash = normalizePayloadKey("/facial_registration");

    expect(withSlash).toBe("/facial_registration");
    expect(withSlash).toBe(withoutSlash);
  });

  it("maps empty and slash-only input to the root key", () => {
    expect(normalizePayloadKey("")).toBe("/");
    expect(normalizePayloadKey("/")).toBe("/");
  });
});

describe("writePayload / readPayloads round trip", () => {
  it("returns a value written under its key", async () => {
    await writePayload({ id: 1 }, "/api/echo/alpha");

    expect(await readPayloads()).toEqual({ "/alpha": { id: 1 } });
  });

  it("overwrites rather than duplicating on a repeat write", async () => {
    await writePayload({ version: 1 }, "/alpha");
    await writePayload({ version: 2 }, "/alpha");

    const registry = await readPayloads();

    expect(Object.keys(registry)).toEqual(["/alpha"]);
    expect(registry["/alpha"]).toEqual({ version: 2 });
  });

  it("leaves other keys untouched when one key is written", async () => {
    await writePayload("keep", "/keep");
    await writePayload("add", "/add");

    expect(await readPayloads()).toEqual({
      "/keep": "keep",
      "/add": "add",
    });
  });

  it("preserves the shape of a nested object value", async () => {
    const value = {
      id: "abc-123",
      count: 3,
      enabled: true,
      missing: null,
      tags: ["a", "b"],
      nested: { deep: { deeper: [{ leaf: true }] } },
      unicode: "naïve — 日本語 🙂",
    };

    await writePayload(value, "/nested");

    expect(await getPayload("/nested")).toEqual(value);
  });

  it("writes valid JSON to disk", async () => {
    await writePayload({ ok: true }, "/disk");

    const raw = readFileSync(payloadFilePath(), "utf8");

    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw)).toEqual({ "/disk": { ok: true } });
  });
});

describe("getPayload", () => {
  it("returns the stored value for a present key", async () => {
    await writePayload({ id: 1 }, "/alpha");

    expect(await getPayload("/alpha")).toEqual({ id: 1 });
  });

  it("returns undefined for an absent key", async () => {
    await writePayload({ id: 1 }, "/alpha");

    expect(await getPayload("/missing")).toBeUndefined();
  });

  it("normalizes its input, so a bare slug finds a prefixed key", async () => {
    await writePayload({ id: "from-prefixed-path" }, "/api/echo/alpha");

    expect(await getPayload("alpha")).toEqual({ id: "from-prefixed-path" });
    expect(await getPayload("/alpha")).toEqual({ id: "from-prefixed-path" });
  });

  it("returns a stored null as null, distinct from an absent key", async () => {
    await writePayload(null, "/nullable");

    const stored = await getPayload("/nullable");
    const absent = await getPayload("/never-written");

    // The key really is present, so `null` is a value rather than a miss.
    expect(Object.hasOwn(await readPayloads(), "/nullable")).toBe(true);
    expect(stored).toBeNull();
    expect(stored).not.toBeUndefined();
    expect(absent).toBeUndefined();
  });
});

describe("deletePayload", () => {
  it("removes the key and returns true", async () => {
    await writePayload({ id: 1 }, "/alpha");

    expect(await deletePayload("/alpha")).toBe(true);
  });

  it("drops the key from the registry afterwards", async () => {
    await writePayload({ id: 1 }, "/alpha");
    await writePayload({ id: 2 }, "/beta");

    await deletePayload("/alpha");

    expect(await readPayloads()).toEqual({ "/beta": { id: 2 } });
    expect(await getPayload("/alpha")).toBeUndefined();
  });

  it("returns false for a key that does not exist", async () => {
    await writePayload({ id: 1 }, "/alpha");

    expect(await deletePayload("/missing")).toBe(false);
    expect(await readPayloads()).toEqual({ "/alpha": { id: 1 } });
  });

  it("returns false and writes nothing when the store is empty", async () => {
    expect(existsSync(payloadFilePath())).toBe(false);

    expect(await deletePayload("/alpha")).toBe(false);
    expect(existsSync(payloadFilePath())).toBe(false);
    expect(await readPayloads()).toEqual({});
  });

  it("normalizes its input, so a prefixed path deletes a bare key", async () => {
    await writePayload({ id: 2 }, "/beta");

    expect(await deletePayload("/api/echo/beta")).toBe(true);
    expect(await readPayloads()).toEqual({});
  });
});

describe("clearPayloads", () => {
  it("returns the number of keys present immediately before the clear", async () => {
    await writePayload(1, "/one");
    await writePayload(2, "/two");
    await writePayload(3, "/three");

    expect(await clearPayloads()).toBe(3);
  });

  it("leaves the store empty afterwards", async () => {
    await writePayload(1, "/one");
    await writePayload(2, "/two");

    await clearPayloads();

    expect(await readPayloads()).toEqual({});
    expect(await getPayload("/one")).toBeUndefined();
  });

  it("is idempotent — a second call returns 0", async () => {
    await writePayload(1, "/one");

    expect(await clearPayloads()).toBe(1);
    await expect(clearPayloads()).resolves.toBe(0);
  });

  it("returns 0 and does not throw when the file was never written", async () => {
    expect(existsSync(payloadFilePath())).toBe(false);

    await expect(clearPayloads()).resolves.toBe(0);
  });
});

describe("payloadFilePath", () => {
  it("uses PAYLOAD_DATA_DIR when it is set", () => {
    expect(payloadFilePath()).toBe(path.join(dataDir, "payload.json"));
  });

  it("falls back to ECHO_REGISTRY_FILE when PAYLOAD_DATA_DIR is unset", () => {
    const registryDir = makeTempDir();
    delete process.env.PAYLOAD_DATA_DIR;
    process.env.ECHO_REGISTRY_FILE = registryDir;

    expect(payloadFilePath()).toBe(path.join(registryDir, "payload.json"));
  });

  it("prefers PAYLOAD_DATA_DIR when both are set", () => {
    process.env.ECHO_REGISTRY_FILE = makeTempDir();

    expect(payloadFilePath()).toBe(path.join(dataDir, "payload.json"));
  });

  it("falls back to data/echo/payload.json under the working directory", () => {
    delete process.env.PAYLOAD_DATA_DIR;
    delete process.env.ECHO_REGISTRY_FILE;

    expect(payloadFilePath()).toBe(
      path.join(process.cwd(), "data", "echo", "payload.json"),
    );
  });
});

describe("resilience", () => {
  it("yields an empty registry for an unparseable file instead of throwing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeFileSync(payloadFilePath(), "{ this is not json", "utf8");

    await expect(readPayloads()).resolves.toEqual({});
  });

  it("treats a zero-byte file as corrupt, warning and yielding {}", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    writeFileSync(payloadFilePath(), "", "utf8");

    await expect(readPayloads()).resolves.toEqual({});
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("corrupt payload file"),
    );
  });
});

describe("lazy environment resolution", () => {
  // Regression guard: a superseded implementation read
  // `process.env.ECHO_REGISTRY_FILE` at module scope, freezing the path at
  // import time. Re-pointing the env var mid-process must move the store.
  it("re-resolves the path when PAYLOAD_DATA_DIR changes mid-process", async () => {
    // The path must already follow the env var that `beforeEach` set after
    // this module was imported, which is only possible if it is read inside
    // the function rather than frozen at module scope.
    expect(payloadFilePath()).toBe(path.join(dataDir, "payload.json"));

    await writePayload({ from: "first" }, "/first");
    expect(await getPayload("/first")).toEqual({ from: "first" });

    const secondDir = makeTempDir();
    process.env.PAYLOAD_DATA_DIR = secondDir;

    // No module reset between these two calls — this is the assertion the
    // module-scope implementation cannot satisfy.
    expect(payloadFilePath()).toBe(path.join(secondDir, "payload.json"));
    expect(await getPayload("/first")).toBeUndefined();

    await writePayload({ from: "second" }, "/second");

    expect(await getPayload("/second")).toEqual({ from: "second" });
    expect(await getPayload("/first")).toBeUndefined();
    expect(existsSync(path.join(dataDir, "payload.json"))).toBe(true);
  });
});

describe("concurrent writes", () => {
  // A fixed `.tmp` name made concurrent captures collide: both wrote the same
  // path, so one `rename` lost its source and the interleaved writes could
  // leave a file that no longer parsed — which reads back as an empty store,
  // i.e. every capture silently discarded. Assert the store survives.
  it("keeps the store parseable when captures are dispatched together", async () => {
    const keys = Array.from({ length: 12 }, (_, i) => `/concurrent-${i}`);

    await Promise.all(
      keys.map((key, i) => writePayload({ n: i }, key)),
    );

    // The whole point: the file must still parse, not degrade to {}.
    expect(existsSync(path.join(dataDir, "payload.json"))).toBe(true);
    expect(await readPayloads()).not.toEqual({});

    // Last-writer-wins per key is the accepted outcome; no key may be stored
    // under a wrong or partial value.
    for (const [i, key] of keys.entries()) {
      expect(await getPayload(key)).toEqual({ n: i });
    }
  });

  it("leaves no temp files behind after concurrent writes settle", async () => {
    await Promise.all([
      writePayload({ n: 1 }, "/a"),
      writePayload({ n: 2 }, "/b"),
      writePayload({ n: 3 }, "/c"),
    ]);

    const leftovers = readdirSync(dataDir).filter((f) => f !== "payload.json");
    expect(leftovers).toEqual([]);
  });
});
