import { NextRequest } from "next/server";
import { handleErrors } from "@/src/shared/errors/handle-errors";
import { capture, replay } from "@/src/features/echo/services/echo";

/**
 * Captures any request body (JSON, form-urlencoded, or multipart) and echoes
 * it back with the mirrored `Content-Type`. Used for testing HTTP clients.
 */
export const POST = handleErrors(async (request: NextRequest) =>
  capture(request),
);

/**
 * Replays the most recently captured body with the exact `Content-Type` the
 * POST arrived with ("form data in → form data out"). Returns 404 until a
 * body has been captured.
 */
export const GET = handleErrors(async () => replay());