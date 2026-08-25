import Fernet from "fernet";

/**
 * Legacy PensionersApp Fernet key, copied from
 * PensionersApp/validation/validation.py (decryptText). It encrypts mobile
 * request fields (username/password/ppo_no/device). Overridable through env
 * for key-rotation experiments; never treat it as our own secret — it ships
 * public inside the pension APK.
 */
const CPPS_LEGACY_KEY =
  process.env.CPPS_FERNET_KEY ||
  "teLsk6phrMHFKeSgsO62ZSF1mR_E5rbEY1z8DCDfuwc=";

/**
 * Decrypts a Fernet token produced by the pension app. Falls back to the raw
 * input when the value is not decryptable, so plain-text bodies fired from
 * rest.http work identically to encrypted app payloads.
 *
 * @param value - Cipher text (or plaintext) from a request field.
 * @returns Decrypted string; '' for non-string/empty inputs.
 *
 * @example
 * ```ts
 * const body = await request.json().catch(() => ({}) as Record<string, unknown>);
 * void tryDecrypt(body.username); // parity only — result intentionally unused
 * ```
 */
export function tryDecrypt(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  try {
    const token = new Fernet.Token({
      secret: new Fernet.Secret(CPPS_LEGACY_KEY),
      token: value,
      ttl: 0,
    });
    return token.decode();
  } catch {
    return value; // plaintext passthrough
  }
}
