import { PaginationMeta } from './pagination-meta';

/**
 * @file Shared API type definitions for HTTP client responses.
 *
 * These types define the standardised envelope returned by every
 * API call through the HTTP client and RPC utilities.
 */

export interface ApiResponse<T> {
  /** Whether the request was processed successfully. */
  success: boolean;
  /** Human-readable status message from the server. */
  message: string;
  /** Response payload — `null` on failure. */
  data: T | null;
  /** Pagination metadata for list endpoints. */
  meta?: PaginationMeta;
  /** Authentication token (returned on login/refresh). */
  token?: string;
  /** Structured error details returned on failure. */
  error?: string | Record<string, unknown>;
}

/**
 * Standard API response structure for all requests.
 *
 * Every HTTP method returns this shape, providing a uniform contract
 * for success/failure, messages, payload data, pagination metadata,
 * and error details.
 *
 * @typeParam T - The type of the `data` payload on success.
 */

/** Supported HTTP methods used in API request configuration. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** A map of header name to header value. */
export type HeadersMap = Record<string, string>;

/**
 * Unified internal response shape to handle both fetch and SSL-pinning.
 *
 * Provides a normalised structure regardless of the underlying HTTP library.
 */
export interface InternalResponse {
  /** HTTP status code. */
  status: number;
  /** Raw response body as a string. */
  body: string;
  /** Response headers. */
  headers: HeadersMap;
}

/**
 * Represents a pending request in the queue while a token refresh is in progress.
 */
export interface QueueItem {
  /** Function to resolve the promise with a new token. */
  resolve: (token: string) => void;
  /** Function to reject the promise with an error. */
  reject: (error: unknown) => void;
}
