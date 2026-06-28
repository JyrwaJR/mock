import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendPushNotificationsAsync = vi.fn();

vi.mock("expo-server-sdk", () => ({
  default: class MockExpo {
    static isExpoPushToken(token: unknown): token is string {
      return typeof token === "string" && token.startsWith("ExponentPushToken[");
    }
    sendPushNotificationsAsync = mockSendPushNotificationsAsync;
  },
}));

async function callPostHandler(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  const request = new Request("http://localhost:3000/api/notifications/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request as any);
}

describe("POST /api/notifications/send", () => {
  beforeEach(() => {
    mockSendPushNotificationsAsync.mockReset();
  });

  it("sends a push notification successfully", async () => {
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "ticket-123" },
    ]);

    const response = await callPostHandler({
      token: "ExponentPushToken[valid-token]",
      title: "Hello",
      body: "World",
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("ok");
    expect(json.data.ticketId).toBe("ticket-123");
  });

  it("rejects an invalid push token format", async () => {
    const response = await callPostHandler({
      token: "invalid-token",
      title: "Hello",
      body: "World",
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it("rejects missing required fields", async () => {
    const response = await callPostHandler({
      token: "ExponentPushToken[valid-token]",
      title: "Hello",
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it("handles Expo API error response", async () => {
    mockSendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "Device not registered",
        details: { error: "DeviceNotRegistered" },
      },
    ]);

    const response = await callPostHandler({
      token: "ExponentPushToken[valid-token]",
      title: "Hello",
      body: "World",
    });

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.data.status).toBe("error");
  });

  it("handles invalid JSON body", async () => {
    const { POST } = await import("../route");
    const request = new Request("http://localhost:3000/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not valid json",
    });

    const response = await POST(request as any);

    expect(response.status).toBe(500);
  });
});
