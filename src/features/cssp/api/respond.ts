import { NextResponse } from "next/server";

/**
 * One canned backend response: the HTTP status the real Django view would
 * return plus the exact JSON body it would serialise.
 *
 * @typeParam T - Discriminated payload union for the owning endpoint.
 */
export interface MockVariant<T = unknown> {
  /** HTTP status code mirrored from the Django view. */
  readonly status: 200 | 202 | 400 | 403 | 429 | 500;
  /** Exact JSON body, including original whitespace quirks. */
  readonly body: T;
}

/**
 * Serialises a mock variant as a JSON `NextResponse` carrying the variant's
 * original HTTP status code, byte-faithful to the Django view output.
 *
 * @param variant - The resolved {@link MockVariant} to emit.
 * @returns A JSON response with the variant's body and status.
 *
 * @example
 * ```ts
 * return respondWith(resolveVariant("login"));
 * ```
 */
export function respondWith<T>(variant: MockVariant<T>): NextResponse {
  return NextResponse.json(variant.body, { status: variant.status });
}
