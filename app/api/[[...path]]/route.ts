import axios from "axios";
import https from "https";
import { NextRequest, NextResponse } from "next/server";

const TARGET_BASE_URL = "https://10.179.35.48:9443";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  const targetUrl =
    `${TARGET_BASE_URL}/${path.join("/")}` + (request.nextUrl.search || "");

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  console.log("request body", body);
  const response = await axios({
    method: request.method,
    url: targetUrl,
    data: body,
    httpsAgent,
    headers: {
      ...Object.fromEntries(request.headers.entries()),
      host: undefined,
    },
    validateStatus: () => true,
  });

  console.log("response", response.data);
  return NextResponse.json(
    typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data),
    {
      status: response.status,
      headers: {
        "Content-Type": response.headers["content-type"] ?? "application/json",
      },
    },
  );
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
