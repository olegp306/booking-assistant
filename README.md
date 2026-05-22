# Slotly AI

Telegram-first booking link for simple specialists: trainers, teachers, coaches, consultants, and other people who need easy scheduling.

## What It Does

- Greets a Telegram visitor and collects name, contact, and consultation topic.
- Shows available consultation slots and confirms a booking.
- Lets a specialist create a Telegram profile, receive a personal booking link, update slots, and check today's schedule.
- Lets a specialist enable auto-approve for specific clients.
- Lets a specialist block vacation or time-off dates so clients cannot book them.
- Keeps booking free by default, with optional paid booking when the specialist wants clients to prepay.
- Lets a specialist create a group event link with one date/time and multiple seats.
- Stores leads, bookings, availability, payment intents, and ledger entries in SQLite.
- Provides a lightweight admin UI for availability, manual leads, manual bookings, and optional paid-booking setup.
- Shows lightweight lead intelligence: contact type, missing fields, and lead temperature.
- Supports multiple specialists through one Telegram bot and specialist-specific deep links.
- Tracks specialist usage, plan status, booking milestones, and consent flags for future monetization.
- Keeps a CRM export boundary ready for a future CRM integration.

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the admin UI:

```text
http://localhost:3001
```

If port `3001` is busy, change `PORT` in `.env`.

## Telegram Setup

1. Create a bot with BotFather.
2. Put the token into `.env`:

```text
TELEGRAM_BOT_TOKEN=your-token-here
TELEGRAM_BOT_USERNAME=your_bot_username
```

3. Restart the app with `npm run dev`.

If `TELEGRAM_BOT_TOKEN` is empty, the app still runs the admin UI and API.

## Production Env

Use `.env.production.example` as the deploy checklist. The current production-required values are:

```text
PORT=3001
DATABASE_PATH=/var/lib/slotly/slotly-ai.sqlite
TELEGRAM_BOT_TOKEN=replace-with-botfather-token
TELEGRAM_BOT_USERNAME=slotly_ai_bot
```

The template also includes reserved placeholders for OpenAI, real payment providers, and external CRM. Those are not required by the current code yet.

## Specialist Booking Links

Create a specialist in the admin UI, through Telegram onboarding, or through `POST /api/providers`. Each specialist receives a booking link:

```text
https://t.me/slotly_ai_bot?start=nastya
```

When a client opens the link, the Telegram bot shows the specialist profile and books against that specialist's availability.

## Specialist Telegram Commands

```text
/trainer
/slots Monday to Friday 14:00-17:00
/today
/autoapprove client@example.com on
/autoapprove client@example.com off
/vacation vacation 2026-06-01 to 2026-06-14
```

`/trainer` starts specialist onboarding in Telegram: name, service format, short bio, optional photo, availability, and then a personal booking link.

`/today` shows the specialist who is booked today. Manual bookings stay `pending` until approved with Telegram inline buttons, unless the client contact is on the specialist's auto-approve list.

`/vacation` blocks full-day date ranges. The current parser supports ISO dates, for example `2026-06-01`.

## Availability Format

The first parser supports this format:

```text
Monday to Friday 14:00-17:00
```

Slots are generated in `Europe/Paris` and stored as UTC timestamps.

## Optional Paid Booking

Free scheduling is the default. A specialist can optionally turn on paid booking:

- `none`: clients request a free booking.
- `deposit`: clients prepay a deposit.
- `full`: clients pay the full session price.

The current implementation uses a local mock payment provider. Paid booking creates a payment intent, holds the slot as `pending`, and confirms the booking after mock payment confirmation. Ledger entries split the payment into platform fee and specialist payout. A real payment provider can replace the mock boundary later.

## Group Events

Specialists can create one-time events for multiple people:

```http
POST /api/providers/:slug/events
```

Each event has a title, description, start/end time, capacity, approval mode, and optional payment-ready settings. The event receives a Telegram deep link:

```text
https://t.me/slotly_ai_bot?start=event_open-singing-class
```

Clients can register for the same date/time. Manual events create `pending` registrations, the host approves or declines, and capacity counts pending plus confirmed seats.

## Useful Commands

```bash
npm test
npm run build
npm run dev
```

## Next CRM Step

Replace `LocalCrmExporter` in `src/integrations/crm.ts` with a real implementation for the target CRM. The API and Telegram bot already call the exporter after lead creation.

The current lead-intelligence layer is local and deterministic. It was shaped after the reusable CRM helpers found in `AI CRM`: normalize contact data, detect missing lead fields, and add a simple temperature signal for follow-up priority.

## Platform CRM And Monetization Path

The specialist model now includes the first platform CRM layer:

- Track every specialist using the bot.
- Count bookings per specialist.
- Store plan, subscription status, trial status, usage notification consent, and marketing consent.
- Trigger lifecycle messages when a specialist reaches usage milestones such as 100 bookings.
- Segment specialists for product updates and consent-based marketing.
- Update specialist CRM preferences through `POST /api/providers/:slug/preferences`.

Before sending promotional or billing messages at scale, add explicit consent, message preferences, and an unsubscribe/stop path.
