# Group Events MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add event-style booking links for one host, one date/time, multiple seats, optional approval, and a future payment-ready registration model.

**Architecture:** Keep individual booking unchanged. Add `Event` and `EventRegistration` beside existing `Booking`; events belong to a specialist/provider, have capacity, a public slug, and an approval mode. Registrations reserve seats as `pending` or `confirmed`; host approve/decline transitions mirror booking approvals.

**Tech Stack:** TypeScript, Express, Telegraf, SQLite, Vitest.

---

## Task 1: Domain

**Files:**
- `src/domain/event.ts`
- `tests/event.test.ts`

- [ ] Add failing tests for event normalization, slug creation, capacity validation, registration status, and capacity checks.
- [ ] Implement `Event`, `EventRegistration`, `createEvent`, `createEventRegistration`, `canAcceptRegistration`.
- [ ] Run `npm test -- tests/event.test.ts`.

## Task 2: Persistence

**Files:**
- `src/storage/database.ts`
- `tests/api.test.ts`

- [ ] Add SQLite `events` table.
- [ ] Add SQLite `event_registrations` table.
- [ ] Add database methods to create/find/list events and registrations.
- [ ] Add database methods to approve/decline registrations.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 3: HTTP API

**Files:**
- `src/http/server.ts`
- `tests/api.test.ts`

- [ ] Add `POST /api/providers/:slug/events`.
- [ ] Add `GET /api/events/:slug`.
- [ ] Add `POST /api/events/:slug/registrations`.
- [ ] Add `POST /api/event-registrations/:id/approve`.
- [ ] Add `POST /api/event-registrations/:id/decline`.
- [ ] Return remaining seats and registration counts.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 4: Telegram Copy And Links

**Files:**
- `src/bot/telegram-copy.ts`
- `tests/telegram-copy.test.ts`

- [ ] Add event welcome copy.
- [ ] Add event registration pending/confirmed copy.
- [ ] Add host approval notification copy.
- [ ] Add event approval keyboard.
- [ ] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 5: Telegram Flow

**Files:**
- `src/bot/telegram.ts`

- [ ] Route `/start event_<slug>` to event registration flow.
- [ ] Collect participant name/contact.
- [ ] Create registration.
- [ ] Notify host for manual approval.
- [ ] Add callback handlers `eventApprove:<id>` and `eventDecline:<id>`.

## Task 6: Versioning, Docs, Verification

**Files:**
- `package.json`
- `package-lock.json`
- `README.md`
- `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`

- [ ] Bump version to `0.2.0`.
- [ ] Document group event links and current payment-ready limitation.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run HTTP smoke: create event, register participant, approve, confirm counts.
- [ ] Commit branch.
- [ ] Prepare PR once a GitHub remote is configured.
