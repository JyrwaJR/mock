# Plan: Proxy Header Fix

**Status:** ACTIVE
**PRD Reference:** docs/superpowers/specs/2026-06-24-proxy-header-fix-design.md
**Tech Stack Confirmed:** Next.js App Router, Axios
**Last Updated:** 2026-06-24

## Tasks

- [ ] [IMPL] Fix proxy route header handling in `app/api/[[...path]]/route.ts`
  - Strip hop-by-hop and Next.js internal headers from request
  - Forward all backend response headers to client
  - Fix body serialization (no double-stringify)
  - Remove debug `console.log` statements
