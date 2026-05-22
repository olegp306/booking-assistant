# Feedback Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect product feedback, feature requests, complaints, and workflow confusion from Telegram conversations across all bots and store them with product version, user context, and screen/flow context.

**Architecture:** Add a feedback capture layer beside lead/booking flows. Every Telegram message can be classified as normal conversation, support issue, bug report, feature request, pricing concern, cancellation reason, or usability confusion. Relevant items become `FeedbackItem` records linked to a user, provider/specialist, current flow, app version, bot username, and optional source message metadata.

**Tech Stack:** TypeScript, Telegraf, Express, SQLite, Vitest, future AI classifier via `OPENAI_API_KEY`.

---

## Product Principles

- Capture feedback invisibly when possible; do not make users fill long forms.
- Ask one short follow-up only when the request is too ambiguous.
- Store enough context to understand what happened later.
- Do not store secrets, payment card data, or unrelated private messages.
- Keep deterministic fallback rules when AI is disabled.
- Make feedback searchable and exportable later to Linear/GitHub/CRM.

## Data To Capture

Each feedback item should include:

- `id`
- `appVersion`
- `botUsername`
- `telegramUserId`
- `providerId` / specialist id when known
- `leadId` when known
- `conversationFlow`: `client_booking`, `specialist_onboarding`, `availability_setup`, `event_registration`, `payment`, `cancellation`, `unknown`
- `screenOrStep`: current bot step or Mini App screen later
- `category`: `feature_request`, `bug_report`, `support_issue`, `pricing_feedback`, `usability_confusion`, `cancellation_reason`, `other`
- `sentiment`: `positive`, `neutral`, `negative`
- `priority`: `low`, `medium`, `high`
- `messageText`
- `summary`
- `status`: `new`, `triaged`, `planned`, `shipped`, `closed`
- `createdAt`

## Task 1: Domain

**Files:**
- `src/domain/feedback.ts`
- `tests/feedback.test.ts`

- [ ] Add `FeedbackCategory`, `FeedbackSentiment`, `FeedbackStatus`.
- [ ] Add `createFeedbackItem`.
- [ ] Add deterministic classifier for obvious Russian/English signals:
  - "хочу", "добавьте", "было бы удобно" -> feature request
  - "не работает", "ошибка", "сломалось" -> bug report
  - "дорого", "оплата", "подписка" -> pricing feedback
  - "не понимаю", "куда нажать" -> usability confusion
- [ ] Run `npm test -- tests/feedback.test.ts`.

## Task 2: Persistence

**Files:**
- `src/storage/database.ts`
- `tests/api.test.ts`

- [ ] Add `feedback_items` table.
- [ ] Add database methods `createFeedbackItem`, `listFeedbackItems`, `updateFeedbackStatus`.
- [ ] Store `appVersion` from package version.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 3: Telegram Capture

**Files:**
- `src/bot/telegram.ts`
- `src/bot/telegram-copy.ts`
- `tests/telegram-copy.test.ts`

- [ ] Track current flow/step in session metadata.
- [ ] Classify incoming text before or after normal flow handling.
- [ ] Save feedback when message looks like a product request, complaint, bug, or confusion.
- [ ] Reply lightly only for explicit feedback:
  - "Спасибо, я записала это как пожелание."
- [ ] Avoid interrupting booking/onboarding flow.
- [ ] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 4: API And Admin View

**Files:**
- `src/http/server.ts`
- `public/index.html`
- `public/app.js`
- `public/styles.css`
- `tests/api.test.ts`

- [ ] Add `GET /api/feedback`.
- [ ] Add `POST /api/feedback`.
- [ ] Add `POST /api/feedback/:id/status`.
- [ ] Show recent feedback in admin with category, version, specialist, flow, and status.
- [ ] Run `npm test -- tests/api.test.ts`.

## Task 5: AI Classifier Hook

**Files:**
- `src/integrations/ai-feedback.ts`
- `.env.production.example`

- [ ] Use `OPENAI_API_KEY` only when present.
- [ ] Send minimal context to AI: message, flow, step, service type.
- [ ] Return category, sentiment, priority, summary.
- [ ] Fall back to deterministic classifier if AI fails or key is absent.

## Task 6: Export And Planning

**Files:**
- `src/integrations/feedback-export.ts`
- `README.md`

- [ ] Add export boundary for future Linear/GitHub Issues/Notion/Airtable.
- [ ] Keep `FEEDBACK_EXPORT_PROVIDER=local` by default.
- [ ] Document how feedback becomes a product backlog item.

## Verification

- [ ] `npm test`
- [ ] `npm run build`
- [ ] HTTP smoke: create feedback item with version and flow, list it, update status.
- [ ] Telegram smoke with real token: send "добавьте оплату абонементом", confirm item stored as feature request.

## Future Ideas

- Cluster repeated requests by semantic similarity.
- Weekly digest: top feature requests and bugs by segment.
- Link feedback to revenue/booking volume.
- Auto-create Linear or GitHub issues after threshold.
- Show "you asked, we shipped" messages to users who requested a feature.
