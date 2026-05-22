# Provider Assistant FAQ Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the booking bot into a personal helper for each specialist by collecting adaptive preparation answers during onboarding and showing them to clients.

**Architecture:** Add a focused provider-assistant domain module that detects the specialist's service category and returns five preparation questions. Persist provider-scoped FAQ answers in SQLite. Extend Telegram onboarding to ask the questions before availability, and expose the FAQ through API/state and provider welcome copy.

**Tech Stack:** TypeScript, Telegraf, Express, SQLite, Vitest.

---

## Task 1: Domain

**Files:**
- Create: `src/domain/provider-assistant.ts`
- Create: `tests/provider-assistant.test.ts`

- [x] Add service category detection for fitness, therapy, beauty, education, consulting, and generic.
- [x] Add five preparation questions per category.
- [x] Add FAQ answer normalization.
- [x] Verify with `npm test -- tests/provider-assistant.test.ts`.

## Task 2: Persistence And API

**Files:**
- Modify: `src/storage/database.ts`
- Modify: `src/http/server.ts`
- Modify: `tests/api.test.ts`

- [x] Add `provider_assistant_faqs` table scoped by `provider_id`.
- [x] Add `replaceProviderAssistantFaqs` and `listProviderAssistantFaqs`.
- [x] Allow `POST /api/providers` to accept assistant FAQ answers.
- [x] Include selected provider FAQ answers in `/api/state`.
- [x] Verify with `npm test -- tests/api.test.ts`.

## Task 3: Telegram Copy And Onboarding

**Files:**
- Modify: `src/bot/telegram-copy.ts`
- Modify: `src/bot/telegram.ts`
- Modify: `tests/telegram-copy.test.ts`

- [x] Add copy helpers for "I am this specialist's assistant".
- [x] Add FAQ preview copy for clients.
- [x] Extend trainer onboarding to ask adaptive preparation questions before availability.
- [x] Store the answers after provider creation.
- [x] Verify with `npm test -- tests/telegram-copy.test.ts`.

## Task 4: Docs, Version, Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/checklists/2026-05-21-slotly-ai-progress.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Bump package version.
- [x] Document adaptive assistant onboarding.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] HTTP smoke: create a fitness specialist with FAQ answers and confirm `/api/state` exposes them.
- [x] Commit and push branch.
