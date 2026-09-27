import { describe, expect, it } from "vitest";
import { GET } from "../route";

describe("GET /api/health", () => {
  it("responds with 200 OK", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
  });

  it("returns a JSON content type", async () => {
    const response = await GET();

    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("reports an ok status with process facts", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("exposes no fields beyond status, uptime, and timestamp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(Object.keys(body).sort()).toEqual(["status", "timestamp", "uptime"]);
  });
});
