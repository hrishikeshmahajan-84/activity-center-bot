---
name: Burnaby scraper session design
description: Durable architectural lessons for the Playwright session manager.
---

**Singleton + in-process lock:** One browser/context/page is shared across requests. Callers hold the lock for the duration of their operation; `releaseBrowserLock()` must be in a `finally` block. This prevents page state corruption from concurrent requests.

**Auth inside error boundary:** `getAuthenticatedPage()` is called inside a try/catch so authentication failures (wrong credentials, browser crash, login timeout) return `outcome: "scraper_error"` to the route handler rather than propagating an unhandled exception to Express. Every outcome — including auth failure — is written to the booking log.

**Credential guard:** Check `credentialsConfigured()` at the top of every scraper function before acquiring the lock. Return a structured `not_configured` result immediately so no browser is launched unnecessarily.

**`about:blank` detection:** A newly created Playwright page has URL `about:blank`, which does not match any login-page pattern. The auth check must explicitly treat blank/non-HTTP URLs as unauthenticated, otherwise a fresh page is incorrectly skipped to the operation without logging in.

**Dry-run logging:** Dry-run attempts are written to the booking log with a `[DRY RUN]` prefix in notes, the same as live attempts. This ensures the dashboard always shows a history of what the scheduler tried.

**Why:** Active Network is a React SPA; raw HTML scraping fails. The lock pattern prevents race conditions during registration windows when the scheduler fires multiple targets in quick succession.
