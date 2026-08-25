import { MockVariant } from "../respond";
import { LcSuccess, MsgError } from "../../types";

/** Response shapes of POST PensionersApp/v1/api/lc (DLC submission, views/lc.py). */
export const LC_VARIANTS = {
  /** DLC stored and accepted by CPPS (lc.py:160). */
  success: { status: 200, body: { msg: "Submitted successfully!", self_ver_code: "00" } },
  /** CPPS push_fc_pensioner_dlc returned success=false (lc.py:165). */
  failed_to_submit: { status: 400, body: { msg: "Failed to submit Life Certificate" } },
  /** Missing/malformed accessToken header. */
  unauthorized: { status: 400, body: { msg: " (Unable to process)" } },
  /** Validation or persistence failure (lines 39,78,165-170). */
  failure: { status: 400, body: { msg: "Error: Unable to process" } },
  /** Outer exception handler (lc.py:183). */
  server_error: { status: 500, body: { msg: "Error: Unable to process. Internal server problem" } },
  /** URL version segment != v1 (lc.py:185). */
  invalid_version: { status: 500, body: { msg: "Invalid api version" } },
} satisfies Record<string, MockVariant<LcSuccess | MsgError>>;

/** Selectable variant names for lc. */
export type LcVariantName = keyof typeof LC_VARIANTS;
