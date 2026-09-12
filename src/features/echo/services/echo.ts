import { NextRequest } from "next/server";
import {
  NotFoundError,
  PayloadTooLargeError,
} from "@/src/shared/errors/http-errors";
import type { CapturedPayload } from "@/src/features/echo/types";
import { getCaptured, setCaptured } from "./store";

/**
 * Maximum accepted capture size in UTF-8 bytes. Keeps the in-memory store
 * bounded since the endpoint deliberately accepts "any JSON data".
 */
export const MAX_CAPTURE_BYTES = 1024 * 1024; // 1 MiB

/** Returns the UTF-8 byte length of a string. */
function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

/**
 * Builds a `200` response carrying the raw body with the given content type,
 * set exactly (no charset or auto-detection added by the framework).
 *
 * @param payload - The body text and content type to echo back.
 */
function echoResponse(payload: CapturedPayload): Response {
  return new Response(payload.body, {
    status: 200,
    headers: { "Content-Type": payload.contentType },
  });
}

/**
 * Captures the raw body of a POST request and echoes it back verbatim.
 *
 * Reads the request body as text regardless of content type (JSON,
 * `application/x-www-form-urlencoded`, or `multipart/form-data` are all
 * stored byte-for-byte), stores it for later {@link replay}, and returns a
 * `200` response mirroring the request's `Content-Type` header.
 *
 * @param request - Incoming POST request.
 * @returns A `200` response echoing the body with the mirrored content type.
 * @throws PayloadTooLargeError when the body exceeds {@link MAX_CAPTURE_BYTES}.
 */
export async function capture(request: NextRequest): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "text/plain";
  const body = await request.text();

  if (byteLength(body) > MAX_CAPTURE_BYTES) {
    throw new PayloadTooLargeError(
      `Payload exceeds ${MAX_CAPTURE_BYTES} bytes`,
    );
  }

  const payload: CapturedPayload = { body, contentType };
  setCaptured(payload);
  return echoResponse(payload);
}

/**
 * Replays the most recently captured body with its original `Content-Type`.
 *
 * The response mirrors the POST exactly: "form data in → form data out".
 *
 * @returns A `200` response with the stored body and stored content type.
 * @throws NotFoundError when no body has been captured yet.
 */
export function replay(): Response {
  const payload = getCaptured();
  if (!payload) {
    throw new NotFoundError(
      "Nothing captured yet — POST a body to /api/echo first",
    );
  }
  return echoResponse(payload);
}