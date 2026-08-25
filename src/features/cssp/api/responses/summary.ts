import { MockVariant } from "../respond";
import { MsgError, SummarySuccess } from "../../types";

/** Response shapes of POST PensionersApp/v1/summary (admin counts, views/summary.py). */
export const SUMMARY_VARIANTS = {
  /** Aggregate dashboard counts (summary.py:38-61). */
  success: {
    status: 200,
    body: {
      registered: 128,
      photo_not_approved: 12,
      photo_approved: 100,
      photo_rejected: 16,
      " dlc_not_approved ": 20,
      dlc_approved: 90,
      dlc_rejected: 18,
    },
  },
  /** username != 'D@p@2021' — typo preserved from source (line 63). */
  invalid_username: { status: 400, body: { msg: "Inavalid username" } },
  /** Missing body fields → outer handler (lines 27,65). */
  failure: { status: 400, body: { msg: " (Unable to process)" } },
} satisfies Record<string, MockVariant<SummarySuccess | MsgError>>;

/** Selectable variant names for summary. */
export type SummaryVariantName = keyof typeof SUMMARY_VARIANTS;
