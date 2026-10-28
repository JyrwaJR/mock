#!/usr/bin/env node

import "dotenv/config";

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type ResponseDataT = {
  response: string | JsonValue;
};

type DecrypedDataT = { data: JsonValue };

export type ScriptPayloadT = {
  method?: string | null;
  url?: string | null;
  encrypt?: boolean;
  status_code?: string | number;
  data: JsonValue;
};

type Entry = {
  sourceKey: string;
  route: string;
  method: string | null;
  status: number;
  data: JsonValue;
  encrypt: boolean;
};

type HttpResult = {
  ok: boolean;
  status: number;
  body: unknown;
  raw: string;
};

const DEFAULT_BASE_URL = "http://192.168.1.5:3000";

const ECHO_ROOT = "/api/echo";

const DEFAULT_PREFIX = "/";

// Add encryption and decryption functions
function encrypt(value: JsonValue): string {
  return JSON.stringify(value);
}

function decrypt<T>(value: string): JsonValue {
  return JSON.parse(value);
}
// const encrypt =

// const decrypt =

/**
 * Fixture source loaded directly from EIS_SEED_DATA.
 * Changes to this to the correct source
 */
const FIXTURES_SOURCE: ScriptPayloadT[] = [];

const args = process.argv.slice(2);

function parseArgs() {
  const options = {
    reset: false,
    baseUrl: process.env.ECHO_BASE_URL ?? DEFAULT_BASE_URL,
    prefix: process.env.ECHO_PREFIX ?? DEFAULT_PREFIX,
    url: undefined as string | undefined,
    method: undefined as string | undefined,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    switch (arg) {
      case "--reset":
        options.reset = true;
        break;

      case "--base-url":
        options.baseUrl = args[++i] ?? options.baseUrl;
        break;

      case "--prefix":
        options.prefix = args[++i] ?? options.prefix;
        break;

      case "--url":
        options.url = args[++i];
        break;

      case "--method":
        options.method = args[++i];
        break;

      case "--help":
      case "-h":
        console.log(`
Usage:
  npx tsx scripts/seed-mock.ts [options]

Options:
  --reset             Clear existing fixtures before seeding
  --base-url <url>    Echo server base URL
  --prefix <prefix>   Fixture prefix (default: /plcvm)
  --url <url>         Verify only the specified URL fixture
  --method <method>   Verify only the specified RPC method
  --help              Show this help
`);
        process.exit(0);

      default:
        if (arg?.startsWith("--")) {
          throw new Error(`Unknown option: ${arg}`);
        }
    }
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, "");
  options.prefix = `/${options.prefix.replace(/^\/+|\/+$/g, "")}`;

  return options;
}

function normalizeRoute(value: string): string {
  return value.split("/").filter(Boolean).join("/");
}

function getEntries(fixtures: ScriptPayloadT[], prefix: string): Entry[] {
  return fixtures.map((fixture) => {
    const isRpc = Boolean(fixture.method) ? true : false;
    const sourceKey = isRpc ? fixture.method! : fixture.url!;
    const normalized = normalizeRoute(sourceKey);
    const route = `${prefix}/${normalized}`;

    return {
      sourceKey,
      route,
      url: isRpc ? null : fixture.url!,
      method: isRpc ? fixture.method! : "",
      status: Number(fixture.status_code ?? 200),
      data: fixture.data,
      isRpc,
      encrypt: fixture.encrypt ?? isRpc,
    };
  });
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function decodeResponseData(value: unknown, entry: Entry): DecrypedDataT {
  if (!entry.encrypt) {
    return value as DecrypedDataT;
  }

  if (typeof value !== "string") {
    throw new Error("Encrypted response must be a string.");
  }

  const decrypted: unknown = decrypt<DecrypedDataT>(value);

  if (typeof decrypted === "string") {
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted as DecrypedDataT;
    }
  }

  return decrypted as DecrypedDataT;
}

function buildPayload(entry: Entry): ScriptPayloadT {
  const data: ResponseDataT = entry.encrypt
    ? // before encrypt to structure the data so that in the response verificatin will be possible how the data will look
      { response: encrypt(JSON.stringify({ data: entry.data })) }
    : { response: entry.data };

  if (entry.method) {
    return {
      method: entry.method,
      status_code: entry.status,
      data,
    };
  }
  return {
    url: Boolean(entry.method) ? undefined : entry.sourceKey,
    status_code: entry.status,
    data,
  };
}

async function requestJson(
  method: string,
  url: string,
  payload?: unknown,
): Promise<HttpResult> {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });

  const raw = await response.text();
  let body: unknown = raw;

  if (raw) {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      // Preserve the raw body when the server does not return JSON.
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
    raw,
  };
}

function echoUrl(baseUrl: string, entry: Entry): string {
  const route = normalizeRoute(entry.route);

  const rpcPrefix = Boolean(entry.method) ? "/rpc" : "";

  return `${baseUrl}${ECHO_ROOT}${rpcPrefix}/${route.replace(/^plcvm\//, "").replace(/^\/+/, "")}`;
}

function getExpectedData(entry: Entry): JsonValue {
  return entry.data;
}

async function resetFixtures(baseUrl: string, prefix: string): Promise<void> {
  const url = `${baseUrl}${ECHO_ROOT}?prefix=${encodeURIComponent(prefix)}`;

  const result = await requestJson("DELETE", url);

  if (!result.ok) {
    throw new Error(`Reset failed: HTTP ${result.status}: ${result.raw}`);
  }

  console.log("Reset    : store cleared");
}

async function seedEntry(baseUrl: string, entry: Entry): Promise<void> {
  const result = await requestJson(
    "POST",
    `${baseUrl}${ECHO_ROOT}`,
    buildPayload(entry),
  );

  if (!result.ok) {
    throw new Error(`Seed failed: HTTP ${result.status}: ${result.raw}`);
  }
}

async function verifyEntry(baseUrl: string, entry: Entry): Promise<void> {
  const url = echoUrl(baseUrl, entry);
  const result = await requestJson("POST", url, buildPayload(entry));

  if (!result.ok) {
    throw new Error(`Read failed: HTTP ${result.status}: ${result.raw}`);
  }

  const responseBody = result.body as ResponseDataT;

  const responseData: unknown = responseBody.response;

  if (entry.encrypt && typeof responseData !== "string") {
    throw new Error("Response data must be a string.");
  }

  let actual: DecrypedDataT;

  try {
    if (entry.encrypt) {
      // Encrypted fixtures must use the ResponseDataT contract.

      actual = decodeResponseData(responseData, entry);
    } else {
      // Unencrypted fixtures must match their original data directly.
      actual = responseData as DecrypedDataT;
    }
  } catch (error) {
    throw new Error(
      `Decrypt/parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const expected = getExpectedData(entry);

  if (!sameJson(actual.data, expected)) {
    throw new Error(
      `Round-trip mismatch: ${entry.encrypt ? "decrypted " : ""}data differs.`,
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  const fixtures = FIXTURES_SOURCE;

  let entries = getEntries(fixtures, options.prefix);

  if (options.method) {
    entries = entries.filter((entry) => entry.method === options.method);
  }

  if (options.url) {
    entries = entries.filter(
      (entry) => !entry.method && entry.sourceKey === options.url,
    );
  }

  console.log(`Echo API : ${options.baseUrl}${ECHO_ROOT}`);
  console.log("Source   : FIXTURES_SOURCE");
  console.log(`Prefix   : ${options.prefix}`);
  console.log(`Fixtures : ${entries.length}`);

  if (options.reset) {
    await resetFixtures(options.baseUrl, options.prefix);
  }

  let failures = 0;

  for (const entry of entries) {
    try {
      await seedEntry(options.baseUrl, entry);
      await verifyEntry(options.baseUrl, entry);

      console.log(`PASS ${entry.route}`);
    } catch (error) {
      failures += 1;

      console.error(
        `FAIL ${entry.route}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (failures > 0) {
    console.error(`\n${failures}/${entries.length} fixture(s) failed.`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nAll ${entries.length} fixture(s) passed.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
