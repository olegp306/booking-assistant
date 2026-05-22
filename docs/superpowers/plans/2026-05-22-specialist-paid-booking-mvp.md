# Specialist Paid Booking MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Slotly AI a free, simple scheduling link for ordinary specialists, while adding an optional mock paid-booking path that confirms a slot after payment.

**Architecture:** Free booking stays the default. Provider-level payment settings control whether booking is free, deposit-based, or fully prepaid. A local payment-intent abstraction and ledger entries create the boundary for a later Stripe, YooKassa, or other real payment adapter.

**Tech Stack:** TypeScript, Express, Telegraf, SQLite, Vitest, static admin UI.

---

## Current Gaps Found

- [x] Real payment architecture was missing.
- [x] Public-facing language was still provider/trainer-heavy in some places.
- [x] Free scheduling needed to stay the default path.
- [x] CRM and monetization existed, but no money ledger existed yet.

## Task 1: Product Language And Defaults

**Files:**
- `src/domain/provider.ts`
- `src/bot/telegram-copy.ts`
- `public/index.html`
- `public/app.js`
- `tests/telegram-copy.test.ts`
- `tests/provider.test.ts`

- [x] Write failing tests that defaults keep booking free: `paymentMode = "none"`, no price required.
- [x] Write failing copy tests for simple paid-booking copy.
- [x] Implement provider payment defaults.
- [x] Update visible admin language to Specialist and Booking Link.
- [x] Run `npm test -- tests/provider.test.ts tests/telegram-copy.test.ts`.

## Task 2: Pricing And Payment Domain

**Files:**
- `src/domain/payment.ts`
- `tests/payment.test.ts`

- [x] Write failing tests for free booking settings.
- [x] Write failing tests for paid booking validation.
- [x] Write failing tests for payment intent creation.
- [x] Write failing tests for ledger split.
- [x] Implement `PaymentMode = "none" | "deposit" | "full"`.
- [x] Implement amount validation in minor currency units.
- [x] Implement platform fee calculation as deterministic local logic.
- [x] Run `npm test -- tests/payment.test.ts`.

## Task 3: Persistence

**Files:**
- `src/storage/database.ts`
- `tests/api.test.ts`

- [x] Write failing API tests proving specialist pricing settings persist.
- [x] Add provider columns for `payment_mode`, `price_minor`, `currency`, and `platform_fee_bps`.
- [x] Add `payment_intents` table.
- [x] Add `ledger_entries` table.
- [x] Add database methods to update payment settings.
- [x] Add database methods to create and confirm payment intents.
- [x] Add database methods to list ledger entries.
- [x] Run `npm test -- tests/api.test.ts`.

## Task 4: Paid Booking API Flow

**Files:**
- `src/http/server.ts`
- `tests/api.test.ts`

- [x] Write failing test: free specialist booking remains simple and requires no payment.
- [x] Write failing test: paid specialist booking returns `paymentIntent` and holds a pending booking.
- [x] Write failing test: confirming mock payment marks booking `confirmed` and creates ledger entries.
- [x] Add `POST /api/providers/:slug/payment-settings`.
- [x] Add paid booking handling in `POST /api/bookings`.
- [x] Add `POST /api/payments/:id/confirm`.
- [x] Run `npm test -- tests/api.test.ts`.

## Task 5: Telegram And Admin Surface

**Files:**
- `src/bot/telegram.ts`
- `src/bot/telegram-copy.ts`
- `public/index.html`
- `public/app.js`
- `tests/telegram-copy.test.ts`

- [x] Add simple copy for paying to secure a slot.
- [x] Keep free booking flow as the simplest path.
- [x] Show payment mode in admin as an optional setting.
- [x] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 6: Documentation And Verification

**Files:**
- `README.md`
- `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`

- [x] Document free-first positioning.
- [x] Document mock paid booking and future real payment provider boundary.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run HTTP smoke: create specialist, enable full payment, create booking, confirm mock payment, verify booking confirmed and ledger entries.

## Next Iteration Candidates

- [ ] Add a real payment adapter behind the current payment-intent boundary.
- [ ] Add payout account onboarding for specialists.
- [ ] Add refund/cancel flows.
- [ ] Add consent-based lifecycle marketing for specialists with real revenue.
