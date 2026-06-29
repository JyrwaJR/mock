import axios from "axios";
import https from "https";
import { NextRequest, NextResponse } from "next/server";

const TARGET_BASE_URL = process.env.TARGET_BASE_URL ?? "http://localhost:3000";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
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

export function filterResponseHeaders(
  rawHeaders: Record<string, unknown>,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    const lower = key.toLowerCase();
    if (
      isHopByHop(lower) ||
      lower === "content-encoding" ||
      lower === "content-length"
    ) {
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
  try {
    const { path = [] } = await params;

    let targetUrl =
      `${TARGET_BASE_URL}/${path.join("/")}` + (request.nextUrl.search || "");

    if (path.join("/") === "oauth2/token") {
      targetUrl = "https://10.179.35.48:9443/oauth2/token";
    }

    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text();

    const forwardedHeaders = buildForwardedHeaders({
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      protocol: request.nextUrl.protocol.replace(":", ""),
      host: request.headers.get("host") ?? request.nextUrl.host,
    });

    console.log("URL =>", targetUrl);
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

    console.log("Status =>", status);

    return new NextResponse(response.data as BodyInit, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("internal server error", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export { handler };
