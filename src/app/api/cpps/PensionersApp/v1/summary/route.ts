import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";

/**
 * Mock of SummaryAPI.post (views/summary.py) — internal admin counts.
 * The real endpoint gates on body username == 'D@p@2021'; the mock always
 * returns the registry-selected variant.
 *
 * @returns Registry-selected SUMMARY_VARIANTS response.
 */
export async function POST() {
  return respondWith(resolveVariant("summary"));
}
