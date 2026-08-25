import { MOCK_RENEWED_TOKEN } from "@feature/cssp/utils/constants/tokens";
import { MockVariant } from "../respond";
import { MsgError, ValidateTokenSuccess } from "../../types";

/** Response shapes of POST PensionersApp/v1/api/validate_token (views/validate_token.py). */
export const VALIDATE_TOKEN_VARIANTS = {
  /** Renew token matched and fresh (<60min) → new session token (lines 34-38). */
  success: { status: 200, body: { status: "VALTOK1001", token: MOCK_RENEWED_TOKEN } },
  /** Renew lookup failed or window elapsed → CheckToken.renew_token None (line 40). */
  renew_failed: { status: 400, body: { msg: "Error" } },
  /** request_token not valid base64 → outer handler (line 47). */
  unauthorised: { status: 403, body: { msg: "Error: Unauthorised access" } },
  /** URL version segment != v1 (line 49). */
  invalid_version: { status: 500, body: { msg: "Invalid api version" } },
} satisfies Record<string, MockVariant<ValidateTokenSuccess | MsgError>>;

/** Selectable variant names for validate_token. */
export type ValidateTokenVariantName = keyof typeof VALIDATE_TOKEN_VARIANTS;
