import { MockVariant } from "../respond";
import { MsgError, VerificationStatusSuccess } from "../../types";

/** Privacy suffix appended by the real API to several ver_status strings. */
const PRIVACY =
  "\n\n The link to our Privacy Policy can be found on the manual of this app.";

/** Response shapes of POST PensionersApp/v1/api/verification_status (views/verification_status.py). */
export const VERIFICATION_STATUS_VARIANTS = {
  /** Approved photo + valid DLC (verification_status.py:107,119). */
  success_dlc_valid: {
    status: 200,
    body: {
      ver_status:
        "Photo is Approved." +
        "\nYour Next Face Verification is on or after  25-02-2027" +
        PRIVACY,
      ver_date: "25-08-2026",
      ver_time: "10:30:00",
      ver_place: "TREASURY",
      ver_nec: "Yes",
      ver_nmc: "N/A",
      is_valid: "01",
    },
  },
  /** Photo pending; no DLC yet — verification-only path (lines 138-153). */
  success_pending: {
    status: 200,
    body: {
      ver_status:
        "Your photo is not yet approved." +
        "\n It is important to submit the Non-employment or Non-Marriage Self Declaration for disbursement of your pension." +
        " \n1. Please click on Submit photo on Home Page." +
        " \n2. Click on Capture photo to do  Face verification and after a successful Face verification, you can submit your Self Declaration" +
        PRIVACY,
      ver_date: "25-08-2026",
      ver_time: "10:30:00",
      ver_place: "-",
      ver_nec: "-",
      ver_nmc: "-",
      is_valid: "03",
    },
  },
  /** Photo rejected ('02'/'12') — remarks surfaced verbatim (line 117). */
  photo_rejected: {
    status: 200,
    body: {
      ver_status: "Your photo has been rejected. Unrecognized photo. Please resubmit your photo.",
      ver_date: "25-08-2026",
      ver_time: "10:30:00",
      ver_place: "-",
      ver_nec: "-",
      ver_nmc: "-",
      is_valid: "02",
    },
  },
  /** No Photo row for the uid (line 158). */
  not_submitted: {
    status: 400,
    body: { msg: " You have not submitted your Photo. Please submit your photo first." + PRIVACY },
  },
  /** CheckToken ExpiredSignature branch. */
  token_expired: { status: 202, body: { msg: " (Access denied)" } },
  /** Missing/malformed accessToken header. */
  unauthorized: { status: 400, body: { msg: " (Unable to process)" } },
  /** Outer exception handler (lines 162-165). */
  failure: { status: 500, body: { msg: "Error: Unable to process" } },
} satisfies Record<string, MockVariant<VerificationStatusSuccess | MsgError>>;

/** Selectable variant names for verification_status. */
export type VerificationStatusVariantName = keyof typeof VERIFICATION_STATUS_VARIANTS;
