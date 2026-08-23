import { decryptText, encryptText } from "./fernet";

export function encryptFields<T>(value: T): T {
  return transform(value, encryptText) as T;
}

export function decryptFields<T>(value: T): T {
  return transform(value, decryptText) as T;
}

function transform(
  value: unknown,
  transformString: (value: string) => string,
): unknown {
  if (typeof value === "string") {
    return transformString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => transform(item, transformString));
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const [key, currentValue] of Object.entries(value)) {
      result[key] = transform(currentValue, transformString);
    }

    return result;
  }

  return value;
}
