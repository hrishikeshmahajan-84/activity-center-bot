---
name: Waitlist alert dedup via DB claim lease
description: How the waitlist-promotion SMS avoids duplicates across processes and crashes.
---

**Rule:** Any "send exactly one alert on a state transition" feature must take a database-backed atomic claim (conditional UPDATE checked via rowCount) *before* sending, with a lease timestamp; only the claimant sends, retries respect an active lease, and delivery/failed-send state is persisted after the send.

**Why:** Completion review rejected a version that persisted the dedup flag only after the SMS call — two scheduler processes (autoscaled deployment) or a crash between "Twilio accepted" and "state persisted" could double-text.

**How to apply:** See `registration_status.alert_pending` / `alert_claimed_at` and `runWaitlistWatchCycle` claim logic (30-min lease; known send failure releases the claim immediately, unknown crash waits out the lease → bounded at-least-once).
