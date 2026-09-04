"use client";

/**
 * Renders an arbitrary value as pretty-printed, monospaced text. String
 * values that look like JSON are re-prettified; other strings and primitives
 * are rendered as-is. Intended for response bodies and headers.
 */
export function JsonViewer({ value }: { value: unknown }) {
  let text: string;
  if (typeof value === "string") {
    try {
      text = JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      text = value;
    }
  } else if (value === undefined) {
    text = "(none)";
  } else {
    text = JSON.stringify(value, null, 2);
  }
  return (
    <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-900 p-4 text-xs leading-5 text-zinc-100">
      {text}
    </pre>
  );
}