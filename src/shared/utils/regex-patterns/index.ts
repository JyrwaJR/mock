/**
 * @file Regular expression patterns for Zod validation schemas.
 *
 * Organised into `ALLOW_REGEX` (input must match) and `DENY_REGEX`
 * (input must NOT match) for clear, composable validation rules.
 */

/**
 * Positive-validation regex patterns for common input formats.
 *
 * Use these in Zod `.regex()` calls to accept only well-formed values.
 *
 * @example
 * ```ts
 * z.string().regex(ALLOW_REGEX.EMAIL)
 * z.string().regex(ALLOW_REGEX.PHONE_IN)
 * ```
 */
export const ALLOW_REGEX = {
  /** Standard email format: `user@domain.tld`. */
  EMAIL: /^[\w.%+-]+@[a-zA-Z\d-]+\.[a-zA-Z]{2,}$/,

  /** Strong password: upper, lower, digit, symbol, 8+ chars. */
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/,

  /** Indian mobile: `+91` followed by a 10-digit number starting with 6-9. */
  PHONE_IN: /^\+91[6-9]\d{9}$/,

  /** International phone: country code + 6-14 digits. */
  PHONE_INTL: /^\+\d{1,3}\d{6,14}$/,

  /** Alphanumeric username with underscores, 3-20 chars. */
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,

  /** URL-safe slug: lowercase words separated by hyphens. */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /** Standard UUID v4 format (case-insensitive). */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  /** Month number: 1-12, with optional leading zero. */
  MONTH_NUMBER: /^(0?[1-9]|1[0-2])$/,

  /** Four-digit year. */
  YEAR_4DIGIT: /^\d{4}$/,

  /** HTTP/HTTPS URL. */
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,

  /** Alphanumeric characters with spaces. */
  ALPHANUMERIC_SPACE: /^[a-zA-Z0-9\s]+$/,

  /** Only alphabetic characters and spaces. */
  ALPHABET_ONLY: /^[a-zA-Z\s]+$/,

  /** Only numeric digits. */
  NUMERIC_ONLY: /^\d+$/,

  /** No digits or special characters (letters and spaces only). */
  TEXT_ONLY: /^[^\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]+$/,

  /** Only uppercase letters and spaces. */
  UPPERCASE_ONLY: /^[A-Z\s]+$/,

  /** Only lowercase letters and spaces. */
  LOWERCASE_ONLY: /^[a-z\s]+$/,

  /** Only special/sign characters. */
  SIGNS_ONLY: /^[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]+$/,

  /** Hex colour code with or without shorthand. */
  HEX_COLOR: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,

  /** Base64-encoded image data URI for common formats. */
  BASE64_IMAGE: /^data:image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,/,

  /** JSON Web Token (three dot-separated base64 segments). */
  JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,

  /** Six-digit OTP. */
  OTP_6DIGIT: /^\d{6}$/,

  /** Credit card number with optional spaces or hyphens every 4 digits. */
  CREDIT_CARD: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,

  /** Indian IFSC bank code: 4 uppercase letters, `0`, then 6 alphanumeric. */
  IFSC_CODE: /^[A-Z]{4}0[A-Z0-9]{6}$/,

  /** Indian GSTIN. */
  GSTIN: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/,

  /** Indian PAN: 5 uppercase, 4 digits, 1 uppercase. */
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,

  /** Indian Aadhaar: 12 digits, optionally grouped as 4-4-4. */
  ADHAAR: /^\d{4}\s?\d{4}\s?\d{4}$/,
};

/**
 * Negative-validation regex patterns for detecting unsafe input.
 *
 * Use these in Zod `.refine()` to reject dangerous content.
 *
 * @example
 * ```ts
 * z.string().refine((v) => !DENY_REGEX.HTML_TAGS.test(v), {
 *   message: "HTML tags are not allowed",
 * })
 * ```
 */
export const DENY_REGEX = {
  /** HTML tags of any kind. */
  HTML_TAGS: /<[^>]*>/,

  /** Common SQL injection patterns including DML/DDL keywords and comment sequences. */
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)|(--)|(;)|(')/i,

  /** Full `<script>` blocks (including nested content). */
  XSS_SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
};
