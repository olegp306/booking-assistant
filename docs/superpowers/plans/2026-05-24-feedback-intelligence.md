# Feedback Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collect product feedback, feature requests, complaints, pricing concerns, and workflow confusion from Telegram/API conversations with product version, user context, provider context, and flow context.

**Architecture:** Add a deterministic feedback domain layer first, with an AI-classifier boundary prepared for later OpenAI usage. Store provider-scoped and platform-wide feedback in SQLite. Expose feedback through HTTP/admin, and let Telegram capture obvious feedback without interrupting booking/onboarding flows.

**Tech Stack:** TypeScript, Telegraf, Express, SQLite, Vitest, future OpenAI classifier hook.

---

## Task 1: Domain

**Files:**
- Create: `src/domain/feedback.ts`
- Create: `tests/feedback.test.ts`

- [x] Add feedback category, sentiment, priority, status, and conversation-flow types.
- [x] Add deterministic classifier for Russian/English feature requests, bugs, pricing feedback, usability confusion, support issues, and cancellation reasons.
- [x] Add `createFeedbackItem` with app version, context, summary, status, and timestamps.
- [x] Run `npm test -- tests/feedback.test.ts`.

## Task 2: Persistence And API

**Files:**
- Modify: `src/storage/database.ts`
- Modify: `src/http/server.ts`
- Modify: `tests/api.test.ts`

- [x] Add `feedback_items` table.
- [x] Add `createFeedbackItem`, `listFeedbackItems`, and `updateFeedbackStatus`.
- [x] Add `GET /api/feedback`, `POST /api/feedback`, and `POST /api/feedback/:id/status`.
- [x] Include `appVersion` from `package.json`.
- [x] Run `npm test -- tests/api.test.ts`.

## Task 3: Telegram Capture

**Files:**
- Modify: `src/bot/telegram.ts`
- Modify: `src/bot/telegram-copy.ts`
- Modify: `tests/telegram-copy.test.ts`

- [x] Track current flow and step from Telegram sessions.
- [x] Classify incoming text around normal flow handling.
- [x] Save obvious feedback without interrupting booking/onboarding.
- [x] Reply lightly for explicit feedback only.
- [x] Run `npm test -- tests/telegram-copy.test.ts`.

## Task 4: Admin View And Export Boundary

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Create: `src/integrations/feedback-export.ts`
- Create: `src/integrations/ai-feedback.ts`

- [x] Show recent feedback in admin with category, version, flow, status, and summary.
- [x] Add local feedback export boundary for future Linear/GitHub/CRM.
- [x] Add AI feedback classifier hook that uses deterministic fallback unless explicitly wired.

## Task 5: Docs, Version, Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Bump package version.
- [x] Document feedback intelligence and backlog export boundary.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] HTTP smoke: create feedback item, list it, update status.
- [x] Commit and push branch.
