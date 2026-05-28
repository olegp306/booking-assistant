# Cancellation Remarketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a client cancels a paid or valuable booking/event seat, help the specialist quickly resell the freed slot to interested subscribers with a friendly Telegram campaign.

**Architecture:** Add cancellation events beside bookings and event registrations. A cancellation can create a `MarketingOpportunity` for a specific specialist, slot, event, or service. The specialist can approve a short broadcast, optionally with an image, and the bot sends it only to users who have opted in to this specialist's updates.

**Tech Stack:** TypeScript, Express, Telegraf, SQLite, Vitest, future Mini App/payment adapter.

---

## Product Shape

User-facing names:
- "Свободное место"
- "Горящий слот"
- "Открылось место"
- "Быстрая запись"

Example broadcast:

```text
Открылось место у Насти сегодня в 18:00.
Тренировка на ноги и мобилити, 60 минут.
Кто хочет - нажмите "Забрать слот".
```

The tone should be lively, but not spammy. The specialist should be able to preview and approve the message before sending.

## Safety And Consent Rules

- [ ] Send only to users who opted in to this specialist's updates.
- [ ] Keep a `STOP` / unsubscribe path.
- [ ] Rate-limit broadcasts per specialist.
- [ ] Never broadcast private cancellation details about the original client.
- [ ] If there was a prepayment, handle refund/credit rules separately from remarketing.
- [ ] Track campaign performance without exposing personal client data.

## Task 1: Cancellation Domain

**Files:**
- `src/domain/cancellation.ts`
- `tests/cancellation.test.ts`

- [ ] Add `CancellationReason = "client_cancelled" | "specialist_cancelled" | "no_show"`.
- [ ] Add `createCancellation` for booking and event registration cancellations.
- [ ] Add `canCreateMarketingOpportunity` for paid, high-demand, or specialist-approved cancellations.
- [ ] Run `npm test -- tests/cancellation.test.ts`.

## Task 2: Marketing Opportunity Domain

**Files:**
- `src/domain/marketing-opportunity.ts`
- `tests/marketing-opportunity.test.ts`

- [ ] Add `MarketingOpportunity` with status `draft | approved | sent | cancelled`.
- [ ] Add source fields: `bookingId`, `eventRegistrationId`, `providerId`, `slotStart`, `slotEnd`.
- [ ] Add optional `imageRef`.
- [ ] Add generated copy fields: `headline`, `body`, `cta`.
- [ ] Run `npm test -- tests/marketing-opportunity.test.ts`.

## Task 3: Subscriber And Consent Persistence

**Files:**
- `src/storage/database.ts`
- `tests/api.test.ts`

- [ ] Add `provider_subscribers` table.
- [ ] Add `marketing_opportunities` table.
- [ ] Add `marketing_messages` table.
- [ ] Store `telegramUserId`, consent status, unsubscribe timestamp, and source.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 4: API Flow

**Files:**
- `src/http/server.ts`
- `tests/api.test.ts`

- [ ] Add `POST /api/bookings/:id/cancel`.
- [ ] Add `POST /api/event-registrations/:id/cancel`.
- [ ] Add `POST /api/marketing-opportunities/:id/approve`.
- [ ] Add `POST /api/marketing-opportunities/:id/cancel`.
- [ ] Return preview copy and recipient count before sending.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 5: Telegram Flow

**Files:**
- `src/bot/telegram.ts`
- `src/bot/telegram-copy.ts`
- `tests/telegram-copy.test.ts`

- [ ] Let users subscribe to updates from a specialist.
- [ ] Let users unsubscribe.
- [ ] Notify specialist when a cancellation creates a remarketing opportunity.
- [ ] Show approve/decline buttons for the campaign.
- [ ] Send broadcast to opted-in subscribers only.
- [ ] Include "Забрать слот" / "Book this spot" button.
- [ ] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 6: AI Copy And Image Hook

**Files:**
- `src/integrations/ai-copy.ts`
- `src/domain/marketing-opportunity.ts`
- `.env.production.example`

- [ ] Use `OPENAI_API_KEY` only when present.
- [ ] Generate short, friendly campaign copy from specialist profile, service, slot time, and optional prompt.
- [ ] Allow specialist-provided image/photo.
- [ ] Keep a deterministic fallback copy when AI is disabled.

## Task 7: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] HTTP smoke: create specialist, create paid booking, cancel booking, create marketing opportunity, approve, verify only subscribed users are queued.
- [ ] Telegram E2E smoke with real bot token when available.

## Future Payment Rules

- If cancellation happens before refund deadline, refund or credit the original client.
- If the freed slot is resold, ledger should show original refund, new payment, platform fee, and specialist payout.
- If the specialist cancels, do not run remarketing automatically unless the specialist explicitly creates a new replacement slot.
