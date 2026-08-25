import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";

/**
 * Mock of SummaryPpoAPI.post (views/summary_ppo.py) — upstream gates on
 * body username == 'MegPlc@2021'; ignored by this mock, which always
 * returns the registry-selected variant.
 *
 * @returns Registry-selected SUMMARY_PPO_VARIANTS response.
 */
export async function POST() {
  return respondWith(resolveVariant("summary_ppo"));
}
