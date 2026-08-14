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

**JSON API scraping (Aug 2026):** The schedule SPA's own REST API (`/rest/myaccount/familyschedules?start_date=&end_date=` + `/filters` for family members) is the reliable data source; call it via `page.evaluate(fetch)` inside the authenticated session — `page.request.get` returns success with zero rows (missing SPA headers). HTML selectors on this site are dead ends.

**Member ID gotcha:** a stale BURNABY_MEMBER_ID secret silently filters all schedules to zero (or targets the wrong family member). The scraper validates the configured ID against the family list from `/filters` and fails loudly if it doesn't match.

**Browser strategy:** Nix-installed chromium (system dep, ships with deployment, self-contained libs) is the working fallback; Playwright's downloaded binary lacks libglib in BOTH dev and the deployed container. Resolve nix chromium via `which chromium` at launch time.

## Signin redirect when session already valid
The site redirects `/signin` away (to /myaccount) when a session cookie is still valid, so the login form never renders. Login flow must treat "redirected off /signin" as already-authenticated instead of waiting for the email input — otherwise a valid session masquerades as a browser/auth timeout failure. Note `isAuthenticated()`'s sign-in-link heuristic yields false negatives on logged-in pages, so login() is re-entered often; the redirect check makes that harmless.
