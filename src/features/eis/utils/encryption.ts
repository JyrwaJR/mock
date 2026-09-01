import crypto from "node:crypto";

/** Symmetric cipher shared with the EIS mobile backend to wrap RPC payloads. */
const ALGORITHM = "aes-256-cbc";

/**
 * Legacy EIS shared secret used to derive the AES-256-CBC key. Matches the
 * constants baked into the EIS backend/PHP shims; never treat it as our own
 * secret — it ships public inside the app and is only used for mock parity.
 * Overridable through `EIS_APP_SECRET` for key-rotation experiments.
 */
const appSk = process.env.EIS_APP_SECRET || "3oiEGuR3zKuv1FKL";

/**
 * Legacy EIS IV salt used to derive the AES IV. See {@link appSk}.
 * Overridable through `EIS_APP_IV` for key-rotation experiments.
 */
const appIv = process.env.EIS_APP_IV || "EisApp";

/**
 * Encrypts a plain string with the EIS AES-256-CBC cipher. The key and IV are
 * derived by SHA-256 hashing {@link appSk} / {@link appIv}, and the result is
 * base64-encoded twice to match PHP's extra `base64_encode()` step.
 *
 * @param plain - UTF-8 string to encrypt (typically the RPC response JSON).
 * @returns Double-base64-encoded ciphertext, byte-compatible with the backend.
 *
 * @example
 * ```ts
 * const token = encrypt(JSON.stringify({ ok: true }));
 * ```
 */
export const encrypt = (plain: string): string => {
  const key = crypto
    .createHash("sha256")
    .update(appSk)
    .digest("hex")
    .substring(0, 32);

  const iv = crypto
    .createHash("sha256")
    .update(appIv)
    .digest("hex")
    .substring(0, 16);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8"),
  );

  let encrypted = cipher.update(plain, "utf8", "base64");
  encrypted += cipher.final("base64");

  // Match PHP's extra base64_encode()
  return Buffer.from(encrypted, "utf8").toString("base64");
};

/**
 * Decrypts an EIS double-base64-encoded AES-256-CBC ciphertext back to its
 * plain JSON string and parses it as the given type.
 *
 * @typeParam T - The shape of the decrypted payload.
 * @param encrypted - Double-base64-encoded ciphertext from the EIS app.
 * @returns The decrypted, JSON-parsed payload of type `T`.
 * @throws When the ciphertext is invalid or the recovered plaintext is not
 *   valid JSON (a malformed body will reject here).
 *
 * @example
 * ```ts
 * const { functionName } = decrypt<{ functionName: string }>(requestData);
 * ```
 */
export const decrypt = <T = unknown>(encrypted: string): T => {
  const key = crypto
    .createHash("sha256")
    .update(appSk)
    .digest("hex")
    .substring(0, 32);

  const iv = crypto
    .createHash("sha256")
    .update(appIv)
    .digest("hex")
    .substring(0, 16);

  const innerBase64 = Buffer.from(encrypted, "base64").toString("utf8");

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(key, "utf8"),
    Buffer.from(iv, "utf8"),
  );

  let decrypted = decipher.update(innerBase64, "base64", "utf8");

  decrypted += decipher.final("utf8");

  return JSON.parse(decrypted) as T;
};
