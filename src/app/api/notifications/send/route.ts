import { NextRequest, NextResponse } from "next/server";
import Expo, { type ExpoPushMessage } from "expo-server-sdk";
import { z } from "zod";

/**
 * Schema for validating the push notification request body.
 *
 * Requires an Expo push token, notification title and body text.
 * Accepts optional fields for advanced notification configuration
 * such as data payload, sound, badge count, priority, TTL, and rich media.
 */
const sendPushSchema = z.object({
  /** Expo push token (e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"). */
  token: z.string().min(1, "Push token is required"),
  /** Notification title displayed in the system tray. */
  title: z.string().min(1, "Title is required"),
  /** Notification body text. */
  body: z.string().min(1, "Body is required"),
  /** Optional JSON data payload delivered to the app. */
  data: z.record(z.string(), z.unknown()).optional(),
  /** Notification sound name or configuration. */
  sound: z.string().optional(),
  /** Badge count to display on the app icon. */
  badge: z.number().int().optional(),
  /** Delivery priority: "default", "normal", or "high". */
  priority: z.enum(["default", "normal", "high"]).optional(),
  /** Time-to-live in seconds before the notification expires. */
  ttl: z.number().int().positive().optional(),
  /** Secondary text displayed under the title on supported platforms. */
  subtitle: z.string().optional(),
  /** Rich media content such as an image URL. */
  richContent: z.object({ image: z.string().url().optional() }).optional(),
});

/**
 * Handles POST requests to send an Expo push notification.
 *
 * Validates the request body, checks the push token format, sends the
 * notification via the Expo push API, and returns the resulting ticket.
 *
 * @example
 *   POST /api/notifications/send
 *   Body: { "token": "ExponentPushToken[xxx]", "title": "Hello", "body": "World" }
 *
 *   Response (200):
 *   { "success": true, "message": "Push notification sent", "data": { "ticketId": "abc", "status": "ok" } }
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
        { status: 400 },
      );
    }

    const {
      token,
      title,
      body: messageBody,
      data,
      sound,
      badge,
      priority,
      ttl,
      subtitle,
      richContent,
    } = parsed.data;

    // Validate that the provided token is a valid Expo push token
    if (!Expo.isExpoPushToken(token)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Expo push token format",
          data: null,
          error: {
            token: [
              "Token must be a valid Expo push token (e.g. ExponentPushToken[xxx])",
            ],
          },
        },
        { status: 400 },
      );
    }

    const expo = new Expo();

    const messages: ExpoPushMessage[] = [
      {
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
      },
    ];

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
        { status: 500 },
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
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        data: null,
      },
      { status: 500 },
    );
  }
}
