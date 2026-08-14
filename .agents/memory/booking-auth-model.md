---
name: Booking endpoint auth model
description: Why check-and-book uses API key auth while browser CRUD endpoints do not.
---

**Rule:** Only `POST /api/scrape/check-and-book/:targetId` requires `Authorization: Bearer <BURNABY_API_KEY>`. Target CRUD and scrape trigger endpoints do not require a key.

**Why:** `check-and-book` executes a real purchase (adds to cart → checkout → confirm payment) and is designed to be called server-to-server by the scheduler process — never directly from the browser. Pre-sharing a secret key with the browser bundle would expose it; session-based browser auth is a separate architectural concern. Target CRUD operations manage only database records with no purchasing side effects; the CORS origin restriction provides the appropriate browser-level protection.

**How to apply:** When Task 3 (Scheduler) calls `check-and-book`, it must send `Authorization: Bearer <BURNABY_API_KEY>` using the server-side env var — never expose this key in client-side code. If a full browser auth system is needed in future (login page, session cookies), that is a separate task and should not block the scraper engine.
