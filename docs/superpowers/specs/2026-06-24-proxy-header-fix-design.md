# Proxy Header Fix — Design Doc

## Purpose

Fix the catch-all proxy route at `app/api/[[...path]]/route.ts` to properly forward request and response headers between client and backend.

## Current Problems

1. **Request headers**: `host: undefined` doesn't strip the header in Axios; Next.js internal headers and hop-by-hop headers leak to the backend
2. **Response headers**: Only `Content-Type` is forwarded — `Set-Cookie`, `Cache-Control`, `Location`, CORS headers, etc. are lost
3. **Double-serialization**: `NextResponse.json()` + manual `JSON.stringify` produces malformed JSON strings

## Changes

### Request header forwarding
- Strip hop-by-hop headers: `transfer-encoding`, `connection`, `keep-alive`, `upgrade`, `proxy-*`
- Strip Next.js internal headers: `x-middleware-*`, `next-url`, `x-invoke-*`, `x-forwarded-*`
- Strip `host` properly using `delete` on Axios headers object
- Forward all remaining headers to the backend

### Response header forwarding
- Collect all response headers from Axios, filter hop-by-hop headers
- Forward remaining headers to the client via `NextResponse`
- Preserve multi-value headers like `set-cookie`

### Body handling
- If backend returns string: use `new NextResponse(data, ...)`
- If backend returns object: use `NextResponse.json(data, ...)`
- No double-serialization

## Files

| File | Change |
|------|--------|
| `app/api/[[...path]]/route.ts` | Rewrite proxy logic with proper header handling |
