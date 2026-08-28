import { MockVariant } from "./respond";
import { CHANGE_PASSWORD_VARIANTS } from "./responses/change-password";
import { CREATE_PENSIONER_VARIANTS } from "./responses/create-pensioner";
import { LC_VARIANTS } from "./responses/lc";
import { LOGIN_VARIANTS } from "./responses/login";
import { LOGOUT_VARIANTS } from "./responses/logout";
import { REGISTRATION_STATUS_VARIANTS } from "./responses/registration-status";
import { SUMMARY_VARIANTS } from "./responses/summary";
import { SUMMARY_PPO_VARIANTS } from "./responses/summary-ppo";
import { VALIDATE_TOKEN_VARIANTS } from "./responses/validate-token";
import { VERIFICATION_VARIANTS } from "./responses/verification";
import { VERIFICATION_STATUS_VARIANTS } from "./responses/verification-status";

/** Map of endpoint key -> its full variant catalogue. */
const ALL_VARIANTS = {
  login: LOGIN_VARIANTS,
  logout: LOGOUT_VARIANTS,
  get_registration_status: REGISTRATION_STATUS_VARIANTS,
  create_pensioner: CREATE_PENSIONER_VARIANTS,
  change_password: CHANGE_PASSWORD_VARIANTS,
  verification: VERIFICATION_VARIANTS,
  verification_status: VERIFICATION_STATUS_VARIANTS,
  lc: LC_VARIANTS,
  validate_token: VALIDATE_TOKEN_VARIANTS,
  summary: SUMMARY_VARIANTS,
  summary_ppo: SUMMARY_PPO_VARIANTS,
} as const;

/** Union of every mockable CPPS endpoint key. */
export type EndpointKey = keyof typeof ALL_VARIANTS;

/**
 * SINGLE SWITCHBOARD — edit these values to change what each mock route
 * returns. TypeScript enforces that every value is an existing variant
 * name for its endpoint via the `satisfies` clause below.
 *
 * @example
 * ```ts
 * CURRENT_VARIANT.verification = ... // no — edit source:
 * // change to: verification: "photo_not_matched"
 * ```
 */
type CurrentVariant = {
  [K in EndpointKey]: keyof (typeof ALL_VARIANTS)[K] & string;
};

export const CURRENT_VARIANT: CurrentVariant = {
  login: "success",
  logout: "success",
  get_registration_status: "success_registered",
  create_pensioner: "success",
  change_password: "success",
  verification: "success",
  verification_status: "success_dlc_valid",
  lc: "success",
  validate_token: "success",
  summary: "success",
  summary_ppo: "success_registered",
} as const satisfies {
  [K in EndpointKey]: keyof (typeof ALL_VARIANTS)[K] & string;
};

/**
 * Resolves the currently-selected variant for an endpoint.
 *
 * @param endpoint - Logical endpoint key (see {@link CURRENT_VARIANT} keys).
 * @returns The selected MockVariant, ready for respondWith().
 * @throws When a registry entry points at a removed variant name (guarded by
 * TS, kept as a runtime safety net).
 */
export function resolveVariant(endpoint: EndpointKey): MockVariant {
  const table = ALL_VARIANTS[endpoint] as Record<string, MockVariant>;
  const variant = table[CURRENT_VARIANT[endpoint]];
  if (!variant) {
    throw new Error(
      `Unknown variant '${String(CURRENT_VARIANT[endpoint])}' for ${endpoint}`,
    );
  }
  return variant;
}
