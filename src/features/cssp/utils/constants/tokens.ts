/**
 * Fixed access token returned by login success bodies.
 * Plain mock string — intentionally NOT a real JWT.
 */
export const MOCK_ACCESS_TOKEN = "cpps-mock-access-token";

/**
 * Fixed renew_token returned by login success bodies. Consumed by
 * POST api/validate_token via the Authorization header.
 */
export const MOCK_RENEW_TOKEN = "cpps-mock-renew-token";

/** Fixed renewed access token returned by validate_token success body. */
export const MOCK_RENEWED_TOKEN = "cpps-mock-renewed-access-token";

/**
 * Special Authorization bearer value simulating an expired session.
 * Any gated mock route seeing this value replies 202 ' (Access denied)',
 * mirroring CheckToken.py's ExpiredSignature branch.
 */
export const EXPIRED_TOKEN = "expired";
