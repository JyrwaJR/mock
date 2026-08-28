import crypto from "node:crypto";
import { MockVariant } from "../respond";
import { MsgError, RegistrationStatusSuccess } from "../../types";

/**
 * SHA-256 of the mock bank account, mirroring
 * hashlib.sha256(...) in views/get_registration_status.py.
 */
const MOCK_BANK_HASH = crypto
  .createHash("sha256")
  .update("1111111111111111")
  .digest("hex");

/** Response shapes of POST PensionersApp/v1/get_registration_status. */
export const REGISTRATION_STATUS_VARIANTS = {
  /** Active local profile found (get_registration_status.py:56-63). */
  success_registered: {
    status: 200,
    body: {
      msg: " ",
      dob: "01-01-1965",
      bank_account_no: MOCK_BANK_HASH,
      status: "02",
    },
  },
  // NOTE: real view omits the status arg here, so DRF answers 200
  // (views/get_registration_status.py:45) — quirk preserved deliberately.
  update_required: {
    status: 200,
    body: { msg: "Please update the app from Play Store/App Store" },
  },
  /** PPO failed username validation (line 52). */
  invalid_ppo: { status: 400, body: { msg: "Error: Invalid PPO No." } },
  /** CPPS profile lookup returned nothing (line 131). */
  no_record: { status: 400, body: { msg: "Error: No record found" } },
  /** Generic persistence/processing failure (lines 37,117). */
  failure: { status: 400, body: { msg: " Error: Unable to process" } },
  /** Outer exception handler (line 139). */
  server_error: { status: 500, body: { msg: "Server error" } },
} satisfies Record<string, MockVariant<RegistrationStatusSuccess | MsgError>>;

/** Selectable variant names for get_registration_status. */
export type RegistrationStatusVariantName =
  keyof typeof REGISTRATION_STATUS_VARIANTS;
