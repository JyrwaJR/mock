# Test API — Design Doc

## Purpose

A catch-all Next.js route handler that responds to any HTTP request with a constant JSON payload. Used for testing HTTP clients, curl, integration tests, etc.

## Route

`/api/[[...slug]]` — optional catch-all that matches `/api`, `/api/anything`, `/api/a/b/c`, etc.

## Behavior

- All HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) return the same response
- Response: `{"status": "ok", "message": "test"}`
- Status code: 200
- Content-Type: `application/json`
- CORS headers included for cross-origin testing

## Implementation

Single file: `app/api/[[...slug]]/route.ts` with exported handlers for each HTTP method.

## Files

| File | Purpose |
|------|---------|
| `app/api/[[...slug]]/route.ts` | Route handler |
