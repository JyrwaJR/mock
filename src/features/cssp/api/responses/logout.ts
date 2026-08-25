import { MockVariant } from "../respond";
import { MsgError } from "../../types";

/** Response shapes of POST PensionersApp/v1/logout (views/logout.py). */
export const LOGOUT_VARIANTS = {
  /** TokenManagement row found and deleted (logout.py:30). */
  success: { status: 200, body: { msg: "Success" } },
  /** Missing/malformed accessToken header via CheckToken. */
  unauthorized: { status: 400, body: { msg: " (Unable to process)" } },
  /** No TokenManagement row for the uid (logout.py:32). */
  failure: { status: 400, body: { msg: "Error: Unable to process" } },
  /** URL version segment != v1 (logout.py:35). */
  invalid_version: { status: 500, body: { msg: "Invalid api version" } },
} satisfies Record<string, MockVariant<MsgError>>;

/** Selectable variant names for logout. */
export type LogoutVariantName = keyof typeof LOGOUT_VARIANTS;
