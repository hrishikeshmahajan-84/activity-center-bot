---
name: Notification channel choice
description: Why the app notifies via Telegram bot instead of Twilio SMS/WhatsApp
---

Notifications go through a Telegram bot (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID secrets); Twilio SMS is only a fallback when Telegram isn't configured.

**Why:** Twilio trial accounts block ALL custom message bodies (error 572006) and the Content/template API (20003); the WhatsApp sandbox also prompted for payment. Telegram's bot API is free and unrestricted. User explicitly chose Telegram.

**How to apply:** Keep new notification types routed through the shared send helper (Telegram-first). Don't reintroduce Twilio-only paths or suggest WhatsApp sandbox again unless the user upgrades Twilio (existing project task covers that).
