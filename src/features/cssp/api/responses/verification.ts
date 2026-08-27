import { MockVariant } from "../respond";
import { MsgError, VerificationSuccess } from "../../types";

/** Response shapes of POST PensionersApp/v1/api/verification (views/verification.py). */
export const VERIFICATION_VARIANTS = {
  /** Face match [1]; returns pension class code (verification.py:226). */
  success: { status: 200, body: { msg: "success", self_ver_code: "44" } }, //
  /** Faces not similar; sentinel code '22' (verification.py:230). */
  photo_not_matched: {
    status: 200,
    body: { msg: "Failed. Photo does not matched", self_ver_code: "22" },
  },
  /** CheckToken ExpiredSignature branch (verification.py:47). */
  token_expired: { status: 202, body: { msg: " (Access denied)" } },
  /** Missing/malformed accessToken header. */
  unauthorized: { status: 400, body: { msg: " (Unable to process)" } },
  /** Missing images, liveness fail, or upstream errors (lines 55,127). */
  maintenance: {
    status: 400,
    body: {
      msg: " Failed!Please try again later. Server is under maintenance.",
    },
  },
  /** CPPS token request failed (line 224). */
  cpps_error_1: { status: 400, body: { msg: "Error 1" } },
  /** CPPS push_pen_registration rejected (line 222). */
  cpps_error_2: { status: 400, body: { msg: "Error 2" } },
  /** Outer exception handler (line 251). */
  unable_to_process: { status: 500, body: { msg: "Error: Unable to process" } },
} satisfies Record<string, MockVariant<VerificationSuccess | MsgError>>;

/** Selectable variant names for verification. */
export type VerificationVariantName = keyof typeof VERIFICATION_VARIANTS;
