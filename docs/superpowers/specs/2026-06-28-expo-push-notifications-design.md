# Expo Push Notification Test Endpoint

**Date:** 2026-06-28
**Status:** Approved
**PRD Reference:** None (ad-hoc feature request)

## Purpose

Provide a simple HTTP POST endpoint for testing Expo push notifications during development. The endpoint accepts an Expo push token and notification content inline, sends the push via the Expo push API, and returns the result — no database or persistence involved.

## Design

### Endpoint

`POST /api/notifications/send`

### Request Body

| Field   | Type                        | Required | Description                                |
| ------- | --------------------------- | -------- | ------------------------------------------ |
| `token` | `string`                    | Yes      | Expo push token (e.g. `ExponentPushToken[...]`) |
| `title` | `string`                    | Yes      | Notification title                         |
| `body`  | `string`                    | Yes      | Notification body text                     |
| `data`  | `Record<string, unknown>`   | No       | Optional JSON data payload                 |

### Response

```typescript
{
  success: boolean;
  message: string;
  data: {
    ticketId?: string;   // Expo push ticket ID on success
    status: "ok" | "error";
    error?: string;       // Error details if any
  } | null;
}
```

### Error Cases

- **400** — Invalid/missing fields (scheme validation failure)
- **500** — Expo push API call fails (network error, Expo service error)

### File Changes

| Action     | File                                            | Description                          |
| ---------- | ----------------------------------------------- | ------------------------------------ |
| Modify     | `package.json`                                  | Add `expo-server-sdk` dependency     |
| Create     | `src/app/api/notifications/send/route.ts`       | POST handler for sending push        |

### Implementation Notes

- Uses Zod for request body validation (matching existing project patterns)
- Follows existing route pattern in `src/app/api/oauth2/token/route.ts`
- Response shape follows `ApiResponse<T>` convention (without the full envelope import, matching the existing API route style)
- The `expo-server-sdk` package provides `Expo` class with `sendPushNotificationsAsync`
