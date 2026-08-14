---
name: Prod data fixes via startup reconciliation
description: How to correct bad production data when the workspace can't write to prod
---
Production DB is read-only from the workspace and the private deployment blocks external API calls, so bad prod data (junk rows, stale dates) cannot be fixed directly.

**Rule:** ship an idempotent startup reconciliation in the API server (runs before the scheduler) that corrects the specific bad rows, then have the user republish.

**Why:** the only write path into prod data is code running inside the deployment; publish syncs code and schema, never data.

**How to apply:** keep such fixes narrowly scoped and no-op when data is already correct (safe in dev); remove them once confirmed applied in prod.
