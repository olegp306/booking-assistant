# Slotly AI Progress Checklist

Current readiness: 100% for the approved MVP plan, plus 100% for the current group events MVP iteration.

Last verification: 2026-05-22 19:27 Europe/Paris.

## Layer Checklist

- [x] Layer 1: Product spec and implementation plan.
- [x] Layer 2: Domain logic for availability, leads, and bookings.
- [x] Layer 3: SQLite persistence, HTTP API, CRM export boundary, and integration tests.
- [x] Layer 4: Telegram adapter with optional startup and booking conversation.
- [x] Layer 5: Admin UI for availability, manual leads, lead selection, slots, and bookings.
- [x] Layer 6: README, `.env.example`, final tests, build, and HTTP smoke check.

## Iteration 2 Checklist

- [x] Slice 1: Telegram copy tests.
- [x] Slice 2: Telegram Russian copy encoding fixed through `src/bot/telegram-copy.ts`.
- [x] Slice 3: Lead intelligence tests.
- [x] Slice 4: Lead intelligence module and `/api/state` exposure.
- [x] Slice 5: Admin UI displays contact type, temperature, and missing fields.
- [x] Slice 6: Final verification for iteration 2.

## Iteration 3 Checklist: Slotly Providers MVP

- [x] Slice 1: Provider domain, slug creation, defaults, confirmation mode.
- [x] Slice 2: Provider-scoped persistence and API state.
- [x] Slice 3: Booking confirmation lifecycle with `pending`, `confirmed`, `declined`, and `cancelled`.
- [x] Slice 4: Telegram provider deep-link client path and provider/client copy helpers.
- [x] Slice 5: Admin provider creation form, provider summary, share-link surface, README update.
- [x] Slice 6: Full tests, TypeScript build, and HTTP smoke verification.

## Iteration 4 Checklist: Telegram Approval Buttons

- [x] Slice 1: Add failing tests for pending booking notification and inline keyboard callback data.
- [x] Slice 2: Implement `formatPendingBookingNotification`.
- [x] Slice 3: Implement `buildApprovalKeyboard`.
- [x] Slice 4: Send provider pending booking notification with inline Approve/Decline buttons.
- [x] Slice 5: Add Telegram callback handlers for `approve:<bookingId>` and `decline:<bookingId>`.
- [x] Slice 6: Notify client after provider approves or declines.
- [x] Slice 7: Run full tests and TypeScript build.

## Iteration 5 Checklist: Platform CRM And Monetization Controls

- [x] Slice 1: Provider CRM domain tests for booking milestones, upgrade prompts, and consent gates.
- [x] Slice 2: Provider billing and consent fields persisted in SQLite.
- [x] Slice 3: `/api/state` exposes `providerCrm` snapshots with booking count, plan, billing status, and segments.
- [x] Slice 4: `/api/providers/:slug/preferences` updates plan, billing status, usage notifications, and marketing consent.
- [x] Slice 5: Admin UI shows provider CRM pills for bookings, plan/status, upgrade prompt eligibility, and marketing eligibility.
- [x] Slice 6: Full tests, TypeScript build, and HTTP smoke verification.

## Iteration 6 Checklist: Trainer Workflow Completeness

- [x] Slice 1: Audit trainer/client cases and add failing tests for readable copy, language detection, schedule formatting, auto-approve contacts, and API behavior.
- [x] Slice 2: Replace Telegram copy with human-readable Russian and English helpers.
- [x] Slice 3: Add trainer controls domain helpers for contact normalization and local-date schedule matching.
- [x] Slice 4: Persist provider auto-approve contacts in SQLite.
- [x] Slice 5: Add API endpoints for provider auto-approvals and today's schedule.
- [x] Slice 6: Apply auto-approve during booking creation.
- [x] Slice 7: Add Telegram trainer onboarding with optional photo, personal link, `/slots`, `/today`, and `/autoapprove`.
- [x] Slice 7.1: Show provider photo to clients when they open a provider deep link.
- [x] Slice 8: Full tests, TypeScript build, and HTTP smoke verification.

## Iteration 7 Checklist: Vacation And Time-Off Blocks

- [x] Slice 1: Add failing tests for Russian/English vacation parsing, slot blocking, and API state.
- [x] Slice 2: Add `time-off` domain parser with inclusive full-day date ranges.
- [x] Slice 3: Extend slot generation with blocked intervals.
- [x] Slice 4: Persist provider time-off blocks in SQLite.
- [x] Slice 5: Expose `POST /api/providers/:slug/time-off` and include `timeOffs` in `/api/state`.
- [x] Slice 6: Add Telegram `/vacation ...` command for providers.
- [x] Slice 7: Update README and verify.

## Iteration 8 Checklist: Free-First Specialist Scheduling With Optional Paid Booking

- [x] Slice 1: Audit remaining gaps: real payment architecture missing, public copy still provider/trainer-heavy, free scheduling must stay default.
- [x] Slice 2: Write implementation plan in `docs/superpowers/plans/2026-05-22-specialist-paid-booking-mvp.md`.
- [x] Slice 3: Add failing tests for payment defaults, paid settings, payment intent, ledger split, payment API, and Telegram payment copy.
- [x] Slice 4: Add payment domain with mock payment intent and ledger split.
- [x] Slice 5: Add provider payment settings with free booking as default.
- [x] Slice 6: Persist payment settings, payment intents, and ledger entries in SQLite.
- [x] Slice 7: Add payment settings API, paid booking response, and mock payment confirmation endpoint.
- [x] Slice 8: Update admin UI to say specialist/booking link and expose optional paid booking.
- [x] Slice 9: Update README with free-first positioning and mock payment boundary.

## Iteration 9 Checklist: Group Events MVP

- [x] Slice 1: Start versioned work on branch `codex/group-events-mvp`.
- [x] Slice 2: Add implementation plan in `docs/superpowers/plans/2026-05-22-group-events-mvp.md`.
- [x] Slice 3: Add failing tests for event domain, event API, and Telegram event copy.
- [x] Slice 4: Add `Event` and `EventRegistration` domain.
- [x] Slice 5: Persist events and registrations in SQLite.
- [x] Slice 6: Add event API endpoints for create, read, register, approve, and decline.
- [x] Slice 7: Add event Telegram deep-link routing and host approval callbacks.
- [x] Slice 8: Bump version to `0.2.0`.
- [x] Slice 9: Update README and verify with HTTP smoke.
- [x] Slice 10: Add production env template and configurable Telegram bot username for share links.
- [x] Slice 11: Add future cancellation remarketing plan for freed paid slots and event seats.

## Verification Evidence

- `npm test`: 4 test files passed, 10 tests passed.
- `npm run build`: TypeScript compilation passed.
- `GET http://localhost:3001`: returned HTTP 200 and contained `Slotly AI`.
- `GET http://localhost:3001/api/state`: returned 26 generated slots, 1 lead, and 1 booking in the local database.
- Manual API smoke: lead creation and booking creation were verified during implementation.
- Iteration 2 `npm test`: 6 test files passed, 17 tests passed.
- Iteration 2 `npm run build`: TypeScript compilation passed.
- Iteration 2 smoke: `GET http://localhost:3001/app.js` contains `insight-row`; `GET /api/state` contains `leadInsights`.
- Iteration 3 `npm test`: 7 test files passed, 26 tests passed.
- Iteration 3 `npm run build`: TypeScript compilation passed.
- Iteration 3 smoke: created provider `nastya-final`, loaded `GET /api/state?provider=nastya-final`, confirmed 45-minute provider slots, created a pending booking, approved it, and confirmed admin `providerForm`.
- Iteration 4 `npm test`: 7 test files passed, 27 tests passed.
- Iteration 4 `npm run build`: TypeScript compilation passed.
- Iteration 5 `npm test`: 8 test files passed, 31 tests passed.
- Iteration 5 `npm run build`: TypeScript compilation passed.
- Iteration 5 smoke: created provider `nastya-crm-smoke`, created a lead, created a `pending` booking, updated provider preferences with marketing consent, confirmed `providerCrm.bookingCount = 1`, `providerCrm.marketingAllowed = true`, and admin HTML contains `providerCrm`.
- Iteration 6 `npm test`: 9 test files passed, 38 tests passed.
- Iteration 6 `npm run build`: TypeScript compilation passed.
- Iteration 6 smoke: created provider `nastya-iter-six`, enabled auto-approve for `vip@example.com`, booked `VIP Client`, confirmed booking status `confirmed`, and confirmed today's schedule returned 1 confirmed booking.
- Iteration 7 `npm test`: 10 test files passed, 42 tests passed.
- Iteration 7 `npm run build`: TypeScript compilation passed.
- Iteration 7 smoke: created provider `vacation-smoke-english`, added `vacation 2026-06-01 to 2026-06-01`, confirmed `timeOffCount = 1`, and confirmed slots start on Tuesday 2026-06-02.
- Iteration 8 `npm test`: 11 test files passed, 50 tests passed.
- Iteration 8 `npm run build`: TypeScript compilation passed.
- Iteration 8 smoke: created specialist `paid-smoke-specialist`, enabled full payment for 50.00 EUR, created a pending booking with payment intent, confirmed mock payment, booking became `confirmed`, and ledger split into `platform_fee = 250` and `provider_payout = 4750`.
- Iteration 9 `npm test`: 12 test files passed, 57 tests passed.
- Iteration 9 `npm run build`: TypeScript compilation passed.
- Iteration 9 smoke: created host `event-smoke-host`, created event `open-singing-smoke`, registered participant as `pending`, approved registration to `confirmed`, and confirmed remaining seats = 1.
- Iteration 9 env hardening: `TELEGRAM_BOT_USERNAME` now drives generated share links; `.env.production.example` documents required production values and reserved future AI/payment/CRM placeholders.
- Iteration 9 marketing planning: added `2026-05-22-cancellation-remarketing.md` for cancellation-triggered subscriber broadcasts.

## Known Constraints

- Telegram behavior requires a real `TELEGRAM_BOT_TOKEN` to test against Telegram.
- Availability parser intentionally supports the first MVP phrase shape: `Monday to Friday 14:00-17:00`.
- External CRM integration is a local no-op implementation behind the exporter interface.
- Real payment collection is not wired yet; the app now has a local mock payment provider, payment intents, and ledger entries so a real payment adapter can be added next.
- Telegram onboarding and approve/decline actions require a real `TELEGRAM_BOT_TOKEN` for end-to-end testing against Telegram.
- Pull request creation requires a configured GitHub remote.
