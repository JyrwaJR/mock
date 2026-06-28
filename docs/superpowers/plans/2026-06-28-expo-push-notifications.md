# Expo Push Notification Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `POST /api/notifications/send` endpoint that accepts an Expo push token and notification content, sends the push via the Expo push API, and returns the result.

**Architecture:** A single Next.js App Router route handler at `src/app/api/notifications/send/route.ts`. Uses Zod for request validation (matching project patterns). Delegates to `expo-server-sdk`'s `Expo` class for push delivery.

**Tech Stack:** Next.js App Router, expo-server-sdk v6.1.0, Zod, TypeScript

---

### Task 1: Install expo-server-sdk

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

  Run:
  ```bash
  npm install expo-server-sdk
  ```
  Expected: Package added to `dependencies` in `package.json`, `node_modules/` updated.

- [ ] **Step 2: Verify the build compiles**

  Run:
  ```bash
  npm run build
  ```
  Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add package.json package-lock.json
  git commit -m "chore: add expo-server-sdk dependency"
  ```

---

### Task 2: Create push notification route handler

**Files:**
- Create: `src/app/api/notifications/send/route.ts`

The handler does the following:
1. Parses the POST body with a Zod schema requiring `token`, `title`, `body` and optionally `data`, `sound`, `badge`, `priority`, `ttl`, `subtitle`, `richContent`
2. Validates the push token via `Expo.isExpoPushToken()`
3. Sends the push via `sendPushNotificationsAsync()`
4. Returns a formatted response matching the project's API response style

- [ ] **Step 1: Create the route handler file**

  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import Expo from "expo-server-sdk";
  import { z } from "zod";

  /**
   * Schema for the push notification request body.
   *
   * Accepts an Expo push token, notification title and body,
   * and optional fields for advanced notification configuration.
   */
  const sendPushSchema = z.object({
    /** Expo push token (e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"). */
    token: z.string().min(1, "Push token is required"),
    /** Notification title displayed in the system tray. */
    title: z.string().min(1, "Title is required"),
    /** Notification body text. */
    body: z.string().min(1, "Body is required"),
    /** Optional JSON data payload delivered to the app. */
    data: z.record(z.unknown()).optional(),
    /** Notification sound configuration. */
    sound: z.string().optional(),
    /** Badge count to display on the app icon. */
    badge: z.number().int().optional(),
    /** Delivery priority: "default" | "normal" | "high". */
    priority: z.enum(["default", "normal", "high"]).optional(),
    /** Time-to-live in seconds for the notification. */
    ttl: z.number().int().positive().optional(),
    /** Secondary text under the title. */
    subtitle: z.string().optional(),
    /** Rich media content (e.g. image URL). */
    richContent: z.object({
      image: z.string().url().optional(),
    }).optional(),
  });

  /**
   * Sends an Expo push notification.
   *
   * Accepts a push token and notification content in the request body,
   * validates them, sends the push via the Expo push API, and returns
   * the resulting ticket (or an error).
   *
   * @example
   *   POST /api/notifications/send
   *   Body: { "token": "ExponentPushToken[xxx]", "title": "Hello", "body": "World" }
   *
   *   Response:
   *   {
   *     "success": true,
   *     "message": "Push notification sent",
   *     "data": { "ticketId": "xxxx", "status": "ok" }
   *   }
   */
  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const parsed = sendPushSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            message: "Validation failed",
            data: null,
            error: parsed.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const { token, title, body: messageBody, data, sound, badge, priority, ttl, subtitle, richContent } = parsed.data;

      // Validate that the provided token is a valid Expo push token
      if (!Expo.isExpoPushToken(token)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid Expo push token format",
            data: null,
            error: { token: ["Token must be a valid Expo push token (e.g. ExponentPushToken[xxx])"] },
          },
          { status: 400 }
        );
      }

      const expo = new Expo();
      const messages: ExpoPushMessage[] = [{
        to: token,
        title,
        body: messageBody,
        ...(data && { data }),
        ...(sound && { sound }),
        ...(badge !== undefined && { badge }),
        ...(priority && { priority }),
        ...(ttl && { ttl }),
        ...(subtitle && { subtitle }),
        ...(richContent && { richContent }),
      }];

      const tickets = await expo.sendPushNotificationsAsync(messages);
      const ticket = tickets[0];

      if (ticket.status === "error") {
        return NextResponse.json(
          {
            success: false,
            message: ticket.message || "Failed to send push notification",
            data: {
              status: "error" as const,
              error: ticket.details?.error,
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Push notification sent",
        data: {
          ticketId: ticket.id,
          status: "ok" as const,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          data: null,
        },
        { status: 500 }
      );
    }
  }
  ```

  Wait — the type `ExpoPushMessage` is exported from `expo-server-sdk`. Let me adjust the import:

  ```typescript
  import Expo, { type ExpoPushMessage } from "expo-server-sdk";
  ```

- [ ] **Step 2: Verify the build compiles**

  Run:
  ```bash
  npm run build
  ```
  Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/api/notifications/send/route.ts
  git commit -m "feat: add Expo push notification send endpoint"
  ```

---

### Task 3: Write tests for the push notification endpoint

**Files:**
- Create: `src/app/api/notifications/send/__tests__/route.test.ts`

The tests should mock `expo-server-sdk`'s `sendPushNotificationsAsync` method and test:
- Successful push notification send
- Invalid push token format
- Missing required fields (validation errors)
- Expo API error response
- Invalid JSON body

- [ ] **Step 1: Create the test file**

  ```typescript
  import { describe, it, expect, vi, beforeEach } from "vitest";

  // Mock expo-server-sdk before importing the handler
  const mockSendPushNotificationsAsync = vi.fn();
  vi.mock("expo-server-sdk", () => ({
    default: class MockExpo {
      static isExpoPushToken(token: unknown): token is string {
        return typeof token === "string" && token.startsWith("ExponentPushToken[");
      }
      sendPushNotificationsAsync = mockSendPushNotificationsAsync;
    },
  }));

  // Helper to call the POST handler
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
      vi.clearAllMocks();
    });

    it("sends a push notification successfully", async () => {
      mockSendPushNotificationsAsync.mockResolvedValueOnce([
        { status: "ok", id: "ticket-123" },
      ]);

      const response = await callPostHandler({
        token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
        title: "Hello",
        body: "Test notification",
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.ticketId).toBe("ticket-123");
      expect(json.data.status).toBe("ok");
    });

    it("rejects an invalid push token format", async () => {
      const response = await callPostHandler({
        token: "invalid-token",
        title: "Hello",
        body: "Test",
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it("rejects missing required fields", async () => {
      const response = await callPostHandler({
        token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.success).toBe(false);
    });

    it("handles Expo API error response", async () => {
      mockSendPushNotificationsAsync.mockResolvedValueOnce([
        {
          status: "error",
          message: "DeviceNotRegistered",
          details: { error: "DeviceNotRegistered" },
        },
      ]);

      const response = await callPostHandler({
        token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
        title: "Hello",
        body: "Test",
      });

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.data.status).toBe("error");
    });

    it("handles invalid JSON body", async () => {
      const { POST } = await import("../route");
      const request = new Request("http://localhost:3000/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });

      const response = await POST(request as any);
      expect(response.status).toBe(500);
    });
  });
  ```

- [ ] **Step 2: Run the tests**

  Run:
  ```bash
  npm test
  ```
  Expected: All tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/api/notifications/send/__tests__/route.test.ts
  git commit -m "test: add tests for Expo push notification endpoint"
  ```
