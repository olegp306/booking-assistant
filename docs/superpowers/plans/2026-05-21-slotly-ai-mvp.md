# Slotly AI MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Telegram-first consultation booking MVP with a lightweight admin UI, local persistence, availability parsing, and CRM-ready lead export boundary.

**Architecture:** A Node/TypeScript app exposes an Express API and admin UI, plus a Telegraf bot adapter. Core booking behavior lives in small domain modules and persists to SQLite through a repository layer.

**Tech Stack:** Node.js, TypeScript, Express, Telegraf, better-sqlite3, Vitest, Vite-free static HTML/CSS/JS.

---

## File Structure

- `package.json`: scripts, dependencies, and project metadata.
- `tsconfig.json`: TypeScript compiler settings.
- `vitest.config.ts`: test runner configuration.
- `src/domain/availability.ts`: parse availability text and generate slots.
- `src/domain/booking.ts`: booking conflict checks and booking creation service.
- `src/domain/lead.ts`: lead input validation and normalization.
- `src/integrations/crm.ts`: CRM export interface and local no-op exporter.
- `src/storage/database.ts`: SQLite connection, schema setup, and repositories.
- `src/http/server.ts`: Express API and static admin hosting.
- `src/bot/telegram.ts`: Telegram conversation adapter.
- `src/index.ts`: application bootstrap.
- `public/index.html`: compact admin interface.
- `public/styles.css`: admin styling.
- `public/app.js`: admin UI behavior.
- `tests/availability.test.ts`: parser and slot tests.
- `tests/booking.test.ts`: booking conflict tests.
- `tests/lead.test.ts`: lead validation tests.

## Tasks

### Task 1: Project Scaffold And Availability Tests

- [x] Create `package.json`, `tsconfig.json`, and `vitest.config.ts`.
- [x] Write failing tests in `tests/availability.test.ts` for parsing `Monday to Friday 14:00-17:00` and generating bookable one-hour slots.
- [x] Run `npm test -- tests/availability.test.ts` and confirm the tests fail because `src/domain/availability.ts` does not exist.
- [x] Implement `src/domain/availability.ts` with `parseAvailabilityText()` and `generateSlots()`.
- [x] Run `npm test -- tests/availability.test.ts` and confirm the tests pass.

### Task 2: Lead Validation

- [x] Write failing tests in `tests/lead.test.ts` for requiring name, contact, and topic.
- [x] Run `npm test -- tests/lead.test.ts` and confirm failures.
- [x] Implement `src/domain/lead.ts` with `normalizeLeadInput()`.
- [x] Run `npm test -- tests/lead.test.ts` and confirm the tests pass.

### Task 3: Booking Service

- [x] Write failing tests in `tests/booking.test.ts` for accepting an open slot and rejecting a booked slot.
- [x] Run `npm test -- tests/booking.test.ts` and confirm failures.
- [x] Implement `src/domain/booking.ts` with `createBooking()` and conflict detection.
- [x] Run `npm test -- tests/booking.test.ts` and confirm the tests pass.

### Task 4: Persistence And HTTP API

- [x] Implement SQLite schema and repository helpers in `src/storage/database.ts`.
- [x] Implement Express routes in `src/http/server.ts`: `GET /api/state`, `POST /api/availability`, `POST /api/leads`, and `POST /api/bookings`.
- [x] Add CRM exporter interface in `src/integrations/crm.ts`.
- [x] Run `npm test` and confirm domain tests still pass.
- [x] Add API integration tests for state, lead creation, CRM export call, booking creation, and duplicate booking rejection.

### Task 5: Telegram Bot Adapter

- [x] Implement `src/bot/telegram.ts` with a simple session state machine: welcome, name, contact, topic, slot selection, confirmation.
- [x] Keep bot startup optional when `TELEGRAM_BOT_TOKEN` is missing so the admin/API can run locally.
- [x] Run `npm test` and confirm tests still pass.

### Task 6: Admin UI And Bootstrap

- [x] Implement `public/index.html`, `public/styles.css`, and `public/app.js`.
- [x] Add manual admin workflow for creating leads, selecting a lead, and booking a generated slot.
- [x] Implement `src/index.ts` to initialize database, HTTP server, and optional bot.
- [x] Run `npm run build`.
- [x] Start `npm run dev` and verify the admin page at `http://localhost:3001` because `3000` was already occupied.
