# Swagger API Explorer + Live Proxy — Design

**Date:** 2026-09-04
**Status:** Approved

## Goal

Add a `swagger` feature that:

1. Reads the OpenAPI/Swagger spec location and target API base URL from environment
   variables (no hardcoded config).
2. Exposes a **live proxy API** that forwards requests to the target API defined by
   the spec.
3. Renders an **interactive explorer page** where the user can browse the spec and
   fire real test requests through the proxy.

## Env Vars (added to `.env.sample`)

| Var                | Sensitivity | Purpose                                                   |
| ------------------ | ----------- | --------------------------------------------------------- |
| `SWAGGER_API_URL`  | [CONFIG]    | URL of the OpenAPI/Swagger spec document (JSON)           |
| `SWAGGER_BASE_URL` | [CONFIG]    | Base URL of the target API the proxy forwards to          |
| `SWAGGER_API_KEY`  | [SECRET]    | Optional; injected into every proxied request as `x-api-key` |

## Architecture

New feature module following the repo's feature-folder convention:

```
src/features/swagger/
├── index.ts                     # barrel — public API of the feature
├── types/index.ts               # pragmatic OpenAPI types (spec, path item, operation, parameter, schema, server)
├── validators/index.ts          # Zod env schema (URL format, optional API key)
├── services/
│   ├── spec-fetcher.ts          # server-only: fetch + 5-minute in-memory TTL cache of the spec
│   ├── request-builder.ts       # pure fns: sanitize path segments, build target URL + query, header allowlist + key injection
│   └── proxy-caller.ts          # executes upstream call (global fetch + AbortController timeout)
└── components/
    ├── spec-explorer.tsx        # layout: header, endpoint nav, detail panel, setup notice
    ├── endpoint-detail.tsx      # params form + JSON request body editor + "Try it out"
    └── json-viewer.tsx          # pretty-printed response display (status, headers, body)
```

### API Routes (App Router)

- `GET /api/swagger/spec` — serves the fetched spec JSON (server-side fetch + TTL cache).
  Returns `{ spec }` on success; a clear error message when env vars are missing or the
  spec cannot be fetched.
- `src/app/api/swagger/proxy/[[...path]]/route.ts` — catch-all proxy. Exports
  `GET`/`POST`/`PUT`/`PATCH`/`DELETE`. Builds the target URL from `SWAGGER_BASE_URL` +
  sanitized path segments + incoming query params; injects `SWAGGER_API_KEY` as
  `x-api-key`; forwards allowlisted headers and the raw body; returns the upstream
  status, headers, and body. Marked `export const dynamic = "force-dynamic"`.

### Frontend

`src/app/swagger/page.tsx` — client component. Loads the spec from
`/api/swagger/spec`, renders the `SpecExplorer`:

- Header with spec title + base-URL badge.
- Endpoint nav: every path from the spec, grouped by method color.
- Endpoint detail: path/query/header parameter inputs (pre-filled with spec defaults),
  JSON body editor, and a "Try it out" button that fires through
  `/api/swagger/proxy/<resolved-path>?query`.
- `JsonViewer` renders the response status, headers, and pretty-printed body.
- When `SWAGGER_API_URL` is not configured, the page shows a friendly setup notice
  pointing at `.env`.

## Data Flow

1. Browser → `/swagger` page → `GET /api/swagger/spec` (server fetches + caches spec)
   → explorer renders.
2. User fills "Try it out" → browser → `/api/swagger/proxy/<path>?query` (matching the
   selected method) → route sanitizes path, injects API key, forwards headers/body →
   target API → response passes back → rendered in the explorer.

## Error Handling

- Spec fetch failure → `503` from `/api/swagger/spec` with a message; page shows a
  banner.
- Upstream network failure → `502` with a message.
- Upstream HTTP error status → forwarded as-is with original status/body.
- Missing/malformed env → `500`/`503` with clear message; UI setup notice.

## Security (OWASP-aware)

- Path sanitization blocks host-override attempts (`//evil.com`) and traversal
  (`..`). User input only ever affects the path appended to the env-fixed base URL —
  never the host.
- Env URLs validated as URLs via Zod; embedded credentials (userinfo) rejected.
  SSRF surface limited to operator-controlled env config.
- Header pass-through is allowlisted (`authorization`, `content-type`, `accept`,
  `x-api-key`); `cookie`, `host`, and `content-length` are never forwarded.
- API key never logged or echoed in responses.
- 30-second upstream timeout via `AbortController`.

## Testing

Focused Vitest tests for **pure logic only**:

- `request-builder`: path sanitization, target-URL construction, query building,
  header allowlist, API key injection.

No route-handler or component tests (keeps with the repo's lean test coverage; the
existing user rule about no tests applies to mock-API features, not this proxy).

## Out of Scope

- OpenAPI response validation (we show what comes back, we don't validate it).
- Editing/reloading the spec from the UI (restart or TTL expiry picks up changes).
- Authentication flows beyond `x-api-key` injection + header pass-through.
- Streaming responses (buffered bodies only, fine for a dev/test tool).