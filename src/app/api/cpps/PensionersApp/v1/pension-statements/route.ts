import { resolveVariant } from "@feature/cssp/api/registry";
import { respondWith } from "@feature/cssp/api/respond";

/**
 * Mock of the pension-statements POST endpoint — returns a base64-encoded
 * PDF statement plus the full pension payment statement array from the
 * registry-selected PENSION_STATEMENTS_VARIANTS entry.
 *
 * @returns Registry-selected pension-statements response.
 */
export async function GET() {
  return respondWith(resolveVariant("pension_statements"));
}
