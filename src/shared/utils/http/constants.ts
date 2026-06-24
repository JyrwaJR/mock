/**
 * @file Shared HTTP client constants.
 *
 * Defines the API base URL, authentication path list, and a helper to
 * check whether a URL targets an auth endpoint (bypassing token refresh).
 */

/**
 * Base URL for the API.
 * Defaults to localhost if `EXPO_PUBLIC_API_URL` is not provided.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL as string;

/**
 * Paths that bypass the automatic token refresh logic.
 * Errors on these paths are returned directly to the caller.
 */
export const AUTH_PATHS = [
  'auth/sign-in',
  'auth/sign-in/verify',
  'auth/sign-up',
  'auth/refresh',
  'auth/forgot-password',
  'auth/reset-password',
] as const;

/**
 * Checks if a given URL is one of the authentication-related paths.
 *
 * @param url - The URL to check.
 * @returns True if the URL is an auth path, false otherwise.
 */
export const isAuthPath = (url: string): boolean => {
  return AUTH_PATHS.some((path) => url.includes(path));
};
