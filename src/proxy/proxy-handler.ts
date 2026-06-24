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

  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: filterRequestHeaders(request.headers),
    validateStatus: () => true,
  });

  const { status } = response;
  const responseHeaders = filterResponseHeaders(response.headers);

  if (typeof response.data === "string") {
    return new NextResponse(response.data, {
      status,
      headers: responseHeaders,
    });
  }

  return NextResponse.json(response.data, { status, headers: responseHeaders });
}

export { handler };
