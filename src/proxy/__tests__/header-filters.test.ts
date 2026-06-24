import { describe, it, expect } from "vitest";
import { filterResponseHeaders } from "../proxy-handler";

describe("filterResponseHeaders", () => {
  it("strips content-length to avoid mismatch after decompression", () => {
    const upstream = {
      "content-type": "application/json",
      "content-length": "42",
      "x-request-id": "abc-123",
    };

    const result = filterResponseHeaders(upstream);

    expect(result.has("content-length")).toBe(false);
    expect(result.get("content-type")).toBe("application/json");
    expect(result.get("x-request-id")).toBe("abc-123");
  });
});
