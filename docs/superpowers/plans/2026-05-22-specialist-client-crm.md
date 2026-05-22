# Specialist Client CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each specialist a private lightweight client CRM: when someone opens a specialist booking link, record them as that specialist's client, notify the specialist, and apply new-client or personal pricing rules.

**Architecture:** Keep platform-wide data private by scoping every client record to `providerId`. Add `ProviderClient` and `ProviderPricingPolicy` beside leads/bookings. Telegram `/start <providerSlug>` upserts a provider-scoped client record before the normal booking flow. Booking responses can include the client-specific price without exposing other specialists' clients.

**Tech Stack:** TypeScript, Telegraf, Express, SQLite, Vitest.

---

## Task 1: Domain

**Files:**
- `src/domain/provider-client.ts`
- `tests/provider-client.test.ts`

- [x] Add `ProviderClientStatus = "new" | "active" | "vip" | "paused" | "blocked"`.
- [x] Add `createProviderClient`.
- [x] Add `touchProviderClient`.
- [x] Add `resolveClientPrice`.
- [x] Add tests for new-client price, default price, and personal override price.
- [x] Run `npm test -- tests/provider-client.test.ts`.

## Task 2: Persistence

**Files:**
- `src/storage/database.ts`
- `tests/api.test.ts`

- [x] Add `provider_clients` table scoped by `provider_id`.
- [x] Add `provider_pricing_policies` table scoped by `provider_id`.
- [x] Add methods `upsertProviderClient`, `listProviderClients`, `updateProviderClient`, `getProviderPricingPolicy`, `updateProviderPricingPolicy`.
- [x] Ensure list methods always require provider id and never expose cross-provider clients.
- [x] Run `npm test -- tests/api.test.ts`.

## Task 3: API

**Files:**
- `src/http/server.ts`
- `tests/api.test.ts`

- [x] Add `GET /api/providers/:slug/clients`.
- [x] Add `POST /api/providers/:slug/pricing-policy`.
- [x] Add `POST /api/providers/:slug/clients/:id`.
- [x] Add client pricing preview to booking response when provider client is known.
- [x] Expose selected specialist clients through `/api/state`.
- [x] Run `npm test -- tests/api.test.ts`.

## Task 4: Telegram

**Files:**
- `src/bot/telegram.ts`
- `src/bot/telegram-copy.ts`
- `tests/telegram-copy.test.ts`

- [x] On `/start <providerSlug>`, upsert provider client with `source = "provider_link"`.
- [x] Notify specialist: "У вас новый человек по ссылке".
- [x] Keep client booking flow unchanged after capture.
- [x] Add simple copy helper for new client notification.
- [x] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 5: UI, Docs, And Verification

**Files:**
- `README.md`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`
- `package.json`
- `package-lock.json`

- [x] Add admin UI surface for selected specialist clients.
- [x] Bump version to `0.3.0`.
- [x] Document private specialist CRM and pricing rules.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] HTTP smoke: create two specialists, add one client to each, verify each sees only own clients and pricing policy applies.
- [x] Commit and push branch.
