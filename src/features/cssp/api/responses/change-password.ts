import { MockVariant } from "../respond";
import { MsgError } from "../../types";

/**
 * Success body of POST api/change_password
 * (views/change_password.py:59).
 */
export interface ChangePasswordSuccess {
  /** Always true on success. */
  change_status: boolean;
}

/** Response shapes of POST PensionersApp/v1/api/change_password. */
export const CHANGE_PASSWORD_VARIANTS = {
  /** Old password matched; new password stored (change_password.py:59-60). */
  success: { status: 200, body: { change_status: true } },
  /** Missing/malformed accessToken header via CheckToken. */
  unauthorized: { status: 400, body: { msg: " (Unable to process)" } },
  /** Old password incorrect (change_password.py:65). */
  access_denied: { status: 403, body: { msg: "Error: Access denied" } },
  /** Password validation or persistence failure (lines 45,63,68,70). */
  failure: { status: 400, body: { msg: "Error: Unable to process" } },
  /** URL version segment != v1 (line 75). */
  invalid_version: { status: 500, body: { msg: "Invalid api version" } },
} satisfies Record<string, MockVariant<ChangePasswordSuccess | MsgError>>;

/** Selectable variant names for change_password. */
export type ChangePasswordVariantName = keyof typeof CHANGE_PASSWORD_VARIANTS;
