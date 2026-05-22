# Slotly Providers MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Slotly AI into one Telegram bot that supports many providers, each with onboarding, provider-scoped availability, share links, client booking, and manual or automatic confirmation.

**Architecture:** Keep the current Express/Telegraf/SQLite app. Add provider domain and persistence, then thread `providerId` through availability, leads, bookings, API state, and Telegram flows while preserving a default provider path for local/manual admin use.

**Tech Stack:** Node.js, TypeScript, Express, Telegraf, better-sqlite3, Vitest, static HTML/CSS/JS admin UI.

---

## File Structure

- Create: `src/domain/provider.ts` for slug creation and provider normalization.
- Modify: `src/domain/booking.ts` for booking status and conflict behavior.
- Modify: `src/storage/database.ts` for providers, provider-scoped availability/leads/bookings, and migration-compatible defaults.
- Modify: `src/http/server.ts` for provider-aware API state and provider creation.
- Modify: `src/bot/telegram-copy.ts` for provider onboarding and approval copy.
- Modify: `src/bot/telegram.ts` for provider and client routing.
- Modify: `public/index.html`, `public/app.js`, `public/styles.css` for provider profile/admin visibility.
- Modify: `README.md` and `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`.
- Create tests: `tests/provider.test.ts`.
- Modify tests: `tests/booking.test.ts`, `tests/api.test.ts`, `tests/telegram-copy.test.ts`.

## Tasks

### Task 1: Provider Domain

- [x] Write failing provider tests for slug creation, default session duration, and confirmation mode.
- [x] Implement `src/domain/provider.ts`.
- [x] Run provider tests and confirm they pass.

### Task 2: Provider-Scoped Persistence

- [x] Add SQLite providers table and provider columns to availability, leads, and bookings.
- [x] Add repository methods to create/list/find providers.
- [x] Preserve default provider behavior for existing admin/API flows.
- [x] Run existing tests and fix repository call sites.

### Task 3: Provider-Aware API

- [x] Extend `/api/state` to return providers and selected provider scoped slots/leads/bookings.
- [x] Add `POST /api/providers`.
- [x] Update API tests for provider creation, scoped slots, and lead insights.
- [x] Run API tests.

### Task 4: Booking Confirmation Lifecycle

- [x] Extend booking status with `pending` and `declined`.
- [x] Make manual providers create pending bookings and auto providers create confirmed bookings.
- [x] Add approve/decline repository methods.
- [x] Update booking/API tests.

### Task 5: Telegram Provider And Client Flows

- [x] Add provider onboarding copy and tested message formatting.
- [x] Route `/start <providerSlug>` as client flow.
- [x] Route plain `/start` as default provider/admin flow.
- [x] Send provider approval messages for pending bookings.
- [x] Keep no-token local startup working.

### Task 6: Admin UI And Docs

- [x] Show provider profile/share link in admin UI.
- [x] Allow provider creation from admin for local testing.
- [x] Show booking status.
- [x] Update README and progress checklist.
- [x] Run full `npm test`, `npm run build`, and HTTP smoke verification.
