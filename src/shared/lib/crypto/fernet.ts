import Fernet from "fernet";

const FERNET_KEY = process.env.FERNET_KEY || "";
const secret = new Fernet.Secret(FERNET_KEY);

export function encryptText(plainText: string): string {
  if (!FERNET_KEY) throw new Error("Fernet key missing");
  const token = new Fernet.Token({
    secret,
    ttl: 0, // 0 means it never expires based on timestamp
  });

  return token.encode(plainText);
}

export function decryptText(encryptedText: string): string {
  const token = new Fernet.Token({
    secret,
    token: encryptedText,
    ttl: 0,
  });

  return JSON.parse(token.decode());
}
