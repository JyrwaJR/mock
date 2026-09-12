/**
 * A body captured by the echo endpoint. The raw body text and its original
 * `Content-Type` are stored verbatim so GET can replay the exact bytes a
 * client POSTed, mirroring the request's content type.
 */
export type CapturedPayload = {
  /** Raw request body bytes as text (JSON, urlencoded, or multipart). */
  body: string;
  /** Original `Content-Type` header value from the POST request. */
  contentType: string;
};