---
name: OpenAPI integer vs number types
description: Why all integer fields in the spec use type: number instead of type: integer.
---

**Rule:** Always use `type: number` (not `type: integer`) for integer-valued fields in `lib/api-spec/openapi.yaml`.

**Why:** Orval v8.23 generates `zod.int()` for `type: integer`. `zod.int()` is zod v4 syntax. The workspace pins `zod@^3.25.76` (v3), which does not have `.int()`. Using `type: integer` causes a TS2308 typecheck failure in generated files.

**How to apply:** Every time you add an ID, count, or integer field to the OpenAPI spec, use `type: number`. After any spec change, run `pnpm --filter @workspace/api-spec run codegen` and then `pnpm run typecheck` to confirm.
