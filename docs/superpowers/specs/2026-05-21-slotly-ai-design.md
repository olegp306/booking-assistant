# Slotly AI Design

## Product Shape

Slotly AI is a Telegram-first booking assistant for AI consultation leads. A referred person opens the bot, gets a warm short welcome, answers a few lightweight questions, sees available consultation slots, books one, and becomes a structured lead.

## MVP Scope

- Telegram bot onboarding with a concise welcome, lead qualification, contact capture, slot selection, and booking confirmation.
- Availability management from free-form admin text such as `Monday to Friday 14:00-17:00`.
- Lead and booking storage in a local SQLite database.
- Minimal web admin UI for viewing leads, bookings, and editing availability text.
- CRM-ready export boundary: the app writes clean lead records through a small integration interface, with a no-op/local implementation for now.

## Out Of Scope

- Real payment flow.
- Multi-consultant calendars.
- Full CRM integration.
- Real LLM parsing in the first pass. The MVP will include a parser boundary and deterministic parsing for common admin phrases.

## Architecture

The app is a Node/TypeScript service with two entry points: an Express web/API server and a Telegram bot adapter. Domain logic is kept in small modules for availability parsing, slot generation, leads, bookings, and CRM export so the bot and admin UI share the same behavior.

SQLite is used for local durability. The schema stores leads, bookings, availability rules, and export status. This keeps the MVP portable while leaving a clear path to PostgreSQL or a managed CRM later.

## User Flow

1. Visitor starts the Telegram bot.
2. Bot sends a short warm invitation to book an AI consultation.
3. Bot asks for name and either email or phone.
4. Bot asks what the person wants to discuss in one short answer.
5. Bot offers the next available slots.
6. Visitor selects a slot.
7. App creates a lead, creates a booking, and confirms the time.
8. Admin can view the lead and booking in the web UI.

## Admin Flow

1. Admin opens the local web UI.
2. Admin edits availability in free text.
3. App parses the text into normalized weekly availability windows.
4. Admin sees generated slots and existing bookings.
5. Admin sees leads with contact, source, topic, booking time, and export status.

## Data Model

- Lead: id, telegram user id, name, contact, topic, source, created time, export status.
- Booking: id, lead id, start time, end time, status, created time.
- Availability: id, original text, parsed rules JSON, timezone, updated time.

## Error Handling

The bot should recover politely from unclear input and ask again. Admin parsing failures should show a plain error message and keep the last valid availability. Booking creation must reject already-booked slots.

## Testing

Tests cover availability parsing, slot generation, booking conflict prevention, and API-level lead creation. UI verification is done by running the local app and opening the admin page.
