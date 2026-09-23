import { handleErrors } from "@/src/shared/errors/handle-errors";
import { replay } from "@/src/features/echo/services/echo";

/**
 * Replays the most recently captured body with the exact `Content-Type` the
 * POST arrived with ("form data in → form data out"). Returns 404 until a
 * body has been captured.
 */
export const POST = handleErrors(async () => replay());
export const PATCH = handleErrors(async () => replay());
export const PUT = handleErrors(async () => replay());
export const GET = handleErrors(async () => replay());
