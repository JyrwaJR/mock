import { NextRequest } from "next/server";
import { NotFoundError } from "@/src/shared/errors/http-errors";
import { verifyAccessToken } from "@/src/shared/utils/jwt-utils";
import { respondWith } from "@/src/features/eis/api/respond";
import { resolveVariant } from "@/src/features/eis/api/registry";
import { RpcMethod } from "@/src/features/eis/types";
import { decrypt } from "@/src/features/eis/utils/encryption";

/**
 * Decrypted payload read from an EIS `request_data` field. Only
 * `functionName` is consumed today; it selects the canned mock catalogue.
 */
export type DecryptedBody = {
  functionName: string;
};

/**
 * Runs the EIS RPC mock end-to-end: authenticates the bearer token, decrypts
 * the request payload, selects the matching mock response for the requested
 * function name, and returns it encrypted.
 *
 * Failure envelope:
 * - Missing `Authorization` header → encrypted `401 Unauthorized: Token Missing`
 * - Invalid/expired token        → encrypted `401 Unauthorized: Token Expire`
 * - Unknown function name / absent fields → encrypted `404`
 * - Any unexpected failure       → encrypted `500 Internal server error`
 *
 * @param request - Incoming Next.js route request carrying the auth header.
 * @param body - Validated request body with `app_id` and encrypted `request_data`.
 * @returns The encrypted {@link respondWith} response for the RPC outcome.
 */
export async function runMockRpc(
  request: NextRequest,
  body: { app_id: string; request_data: string },
): Promise<Response> {
  try {
    const { app_id: appId, request_data: requestData } = body;
    const header = request.headers.get("authorization");
    const bearerToken = header?.split(" ")[1];

    if (!bearerToken) {
      return respondWith({
        message: "Unauthorized: Token Missing",
        status_code: "401",
      });
    }

    try {
      await verifyAccessToken(bearerToken);
    } catch {
      return respondWith({
        message: "Unauthorized: Token Expire",
        status_code: "401",
      });
    }

    if (!appId) {
      throw new NotFoundError("App Id not found");
    }

    if (!requestData) {
      throw new NotFoundError("Request Data not found");
    }

    const decrypted = decrypt<DecryptedBody>(requestData);

    if (!decrypted.functionName) {
      throw new NotFoundError("Method not found");
    }

    const method = decrypted.functionName as RpcMethod;
    const response = resolveVariant(method);

    if (!response) {
      return respondWith({
        message: "Method not found",
        status_code: "404",
      });
    }

    return respondWith(response);
  } catch (error) {
    console.log("error", error);
    return respondWith({
      message: "Internal server error",
      status_code: "500",
      data: {},
    });
  }
}
