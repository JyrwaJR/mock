import { MockVariant } from "../respond";
import { MsgError } from "../../types";

/** Response shapes of POST PensionersApp/v1/api/create_pensioner (views/create_pensioner.py). */
export const CREATE_PENSIONER_VARIANTS = {
  /** Password set / reset successfully (create_pensioner.py:70). */
  success: {
    status: 200,
    body: { msg: "Password is set successfully.\n You can login using PPO No as your username." },
  },
  /** bank_account_no hash or dob mismatch for existing user (line 60). */
  invalid_data: { status: 400, body: { msg: "Invalid data" } },
  /** Fernet decryption of request fields failed (line 46). */
  invalid_request: { status: 400, body: { msg: "Error: Invalid PPO No or password" } },
  /** Validation or profile lookup failure (lines 36,66,68). */
  failure: { status: 400, body: { msg: " Error: Unable to process" } },
  /** URL version segment != v1 (line 76). */
  invalid_version: { status: 500, body: { msg: "Invalid api version" } },
} satisfies Record<string, MockVariant<MsgError>>;

/** Selectable variant names for create_pensioner. */
export type CreatePensionerVariantName = keyof typeof CREATE_PENSIONER_VARIANTS;
