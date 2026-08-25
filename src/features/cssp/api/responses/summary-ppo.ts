import { MockVariant } from "../respond";
import { MsgError, SummaryPpoSuccess } from "../../types";

/** Response shapes of POST PensionersApp/v1/summary_ppo (admin per-PPO status, views/summary_ppo.py). */
export const SUMMARY_PPO_VARIANTS = {
  /** User with photo and DLC history (summary_ppo.py:36-59). */
  success_registered: {
    status: 200,
    body: {
      registered: "Registered",
      photo_status: "00",
      photo_remarks: "Your photo has been approved",
      dlc_status: "01",
      dlc_remarks: "-",
    },
  },
  /** Registered user without photo/DLC submissions (fallbacks lines 48,57). */
  success_empty: {
    status: 200,
    body: { registered: "Registered", photo_status: "No Photo submitted.", dlc_status: "No DLC submitted" },
  },
  /** username != 'MegPlc@2021' (summary_ppo.py:63). */
  invalid_username: { status: 400, body: { msg: "Invalid username" } },
  /** Missing ppo_no/username or lookup exception (lines 26,61,66). */
  unable_to_process: { status: 400, body: { msg: "Unable to process" } },
} satisfies Record<string, MockVariant<SummaryPpoSuccess | MsgError>>;

/** Selectable variant names for summary_ppo. */
export type SummaryPpoVariantName = keyof typeof SUMMARY_PPO_VARIANTS;
