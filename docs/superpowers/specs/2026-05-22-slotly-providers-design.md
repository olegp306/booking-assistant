# Slotly Providers Design

## Product Shape

Slotly Providers turns Slotly AI from a single-owner booking assistant into one Telegram bot that can host many specialists. A trainer, consultant, coach, or therapist can onboard in Telegram, create a public profile, define availability in natural language, receive a personal share link, and approve or auto-confirm bookings from clients.

## MVP Scope

- One shared Telegram bot with provider-specific deep links.
- Provider onboarding inside Telegram: name, short bio, optional photo URL or Telegram photo file id, service name, session duration, confirmation mode.
- Provider availability via free-form text such as `Monday to Friday 14:00-17:00`.
- Provider share link: `https://t.me/<bot>?start=<providerSlug>`.
- Client booking flow scoped to a provider.
- Booking status lifecycle: `pending`, `confirmed`, `declined`, `cancelled`.
- Provider notification for manual approval: approve or decline.
- Admin/API support for providers, provider-scoped slots, leads, bookings, and lead insights.

## Out Of Scope

- Payments.
- Calendar sync.
- Separate Telegram bot token per provider.
- Full media hosting. The MVP stores profile photo references, not processed image assets.
- Multi-language provider pages.

## Architecture

The app remains a Node/TypeScript service with Express, Telegraf, SQLite, and shared domain modules. Provider-aware domain logic is added without replacing the existing booking and lead primitives.

Data becomes provider-scoped:

- Provider owns profile, availability, confirmation mode, and share slug.
- Lead belongs to a provider.
- Booking belongs to a provider and lead.
- Availability belongs to a provider.

The Telegram bot has two high-level modes:

- Provider mode: onboarding, availability setup, share link, booking approvals.
- Client mode: deep-link entry, profile preview, lead capture, slot selection.

## Flows

### Provider Onboarding

1. Provider starts bot without a provider deep-link.
2. Bot asks whether they want to create a booking profile.
3. Bot collects name, service name, bio, optional photo reference, duration, availability, and confirmation mode.
4. Bot parses availability and previews generated slots.
5. Provider confirms setup.
6. Bot stores provider and returns a share link.

### Client Booking

1. Client opens provider share link.
2. Bot resolves provider slug.
3. Bot shows provider name, service, bio, and optional photo.
4. Bot collects client name, contact, and topic/goal.
5. Bot offers provider-scoped slots.
6. Client selects a slot.
7. If provider uses auto-confirm, booking is confirmed immediately.
8. If provider uses manual confirmation, booking is pending and provider receives approve/decline controls.

### Provider Approval

1. Provider receives a pending booking notification.
2. Provider clicks approve or decline.
3. Booking status updates.
4. Client receives confirmation or decline message.

## Data Model

- Provider: id, telegram user id, slug, display name, service name, bio, photo reference, session duration, confirmation mode, created time.
- Availability: provider id, original text, parsed rules JSON, timezone, updated time.
- Lead: provider id, telegram user id, name, contact, topic, source, created time, export status.
- Booking: provider id, lead id, client telegram user id, start, end, status, created time, updated time.

## Error Handling

Provider slugs must be unique and stable. Booking creation must reject conflicts for confirmed and pending bookings. Deep links for missing providers should show a friendly fallback. Manual approval actions must be idempotent if clicked twice.

## Testing

Tests cover provider slug generation, provider-scoped slot generation, pending vs auto-confirm booking behavior, provider lookup by slug, API provider state, and Telegram copy for provider/client flows.
