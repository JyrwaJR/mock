import crypto from "node:crypto";

const ALGORITHM = "aes-256-cbc";

const appSk = "3oiEGuR3zKuv1FKL";
const appIv = "EisApp";

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
