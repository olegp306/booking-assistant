# Roles Telegram Admin Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit platform/specialist/client role model and a friendly Telegram admin menu for specialists inside the existing single-bot flow.

**Architecture:** Keep one Telegram bot and route each message by Telegram user id, command, callback payload, and provider deep-link context. Add a small role resolver that marks configured platform admins, provider owners, and booking-only clients without forcing separate bots or chats. Keep the Telegram menu as pure copy/keyboard builders so behavior is testable without Telegram network calls.

**Tech Stack:** TypeScript, Telegraf, Express, better-sqlite3, Vitest, Supertest.

---

### Task 1: Role Resolver

**Files:**
- Create: `src/domain/roles.ts`
- Test: `tests/roles.test.ts`
- Modify: `src/http/server.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveTelegramRole, parseSuperAdminIds } from "../src/domain/roles.js";

describe("roles", () => {
  it("parses comma separated super admin Telegram ids", () => {
    expect(parseSuperAdminIds(" 1,2, ,3 ")).toEqual(["1", "2", "3"]);
  });

  it("resolves super admins before specialist ownership", () => {
    expect(
      resolveTelegramRole({
        telegramUserId: "42",
        superAdminTelegramIds: ["42"],
        ownedProvider: { id: "provider-1", slug: "nastya" }
      })
    ).toEqual({ role: "super_admin", providerId: "provider-1", providerSlug: "nastya" });
  });

  it("resolves provider owners and client-only users", () => {
    expect(
      resolveTelegramRole({
        telegramUserId: "100",
        superAdminTelegramIds: ["42"],
        ownedProvider: { id: "provider-2", slug: "coach" }
      })
    ).toEqual({ role: "specialist_admin", providerId: "provider-2", providerSlug: "coach" });

    expect(resolveTelegramRole({ telegramUserId: "200", superAdminTelegramIds: ["42"] })).toEqual({
      role: "client"
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/roles.test.ts`

Expected: FAIL because `src/domain/roles.ts` does not exist.

- [ ] **Step 3: Implement minimal role resolver**

Create `src/domain/roles.ts`:

```ts
export type TelegramRole = "super_admin" | "specialist_admin" | "client";

export type ResolvedTelegramRole = {
  role: TelegramRole;
  providerId?: string;
  providerSlug?: string;
};

export function parseSuperAdminIds(value = ""): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveTelegramRole(input: {
  telegramUserId: string;
  superAdminTelegramIds?: string[];
  ownedProvider?: { id: string; slug: string };
}): ResolvedTelegramRole {
  const providerFields = input.ownedProvider
    ? { providerId: input.ownedProvider.id, providerSlug: input.ownedProvider.slug }
    : {};

  if ((input.superAdminTelegramIds ?? []).includes(input.telegramUserId)) {
    return { role: "super_admin", ...providerFields };
  }

  if (input.ownedProvider) {
    return { role: "specialist_admin", ...providerFields };
  }

  return { role: "client" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/roles.test.ts`

Expected: PASS.

### Task 2: Telegram Admin Menu Copy And Buttons

**Files:**
- Modify: `src/bot/telegram-copy.ts`
- Test: `tests/telegram-copy.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests for `buildSpecialistAdminKeyboard`, `buildSuperAdminKeyboard`, `formatSpecialistAdminMenu`, and `formatSuperAdminMenu`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/telegram-copy.test.ts`

Expected: FAIL because menu helpers do not exist.

- [ ] **Step 3: Implement copy and keyboard builders**

Add pure helpers to `telegram-copy.ts`. Callback data must be stable:

```ts
provider:share
provider:slots
provider:today
provider:autoapprove
provider:vacation
provider:payment
super:providers
super:feedback
super:usage
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/telegram-copy.test.ts`

Expected: PASS.

### Task 3: Telegram Bot Menu Routing

**Files:**
- Modify: `src/bot/telegram.ts`
- Test: existing copy/domain tests plus TypeScript build

- [ ] **Step 1: Add `superAdminTelegramIds` input**

Extend `createTelegramBot` input with optional `superAdminTelegramIds?: string[]`.

- [ ] **Step 2: Route `/start` without provider payload to role-aware menu**

If sender is super admin, show super admin menu. If sender owns a provider profile, show specialist menu. Otherwise keep client welcome.

- [ ] **Step 3: Add `/menu` and `/link`**

`/menu` should show role-aware menu. `/link` should show the provider share link for specialist admins and super admins who also own a profile.

- [ ] **Step 4: Add callback actions**

Handle provider menu callbacks by replying with practical commands or data:
- share link
- slot update instructions
- today schedule
- auto-approve instructions
- vacation instructions
- payment settings note

Handle super admin callbacks by replying with platform summary placeholders backed by real provider count/feedback count where available.

### Task 4: HTTP State Role Summary

**Files:**
- Modify: `src/http/server.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write failing API test**

Add a test for `/api/state?telegramUserId=...` returning `currentUserRole`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/api.test.ts`

Expected: FAIL because `currentUserRole` is missing.

- [ ] **Step 3: Implement state role summary**

Use `resolveTelegramRole` with `process.env.SUPER_ADMIN_TELEGRAM_IDS`, unless tests pass an override through `createServer`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/api.test.ts`

Expected: PASS.

### Task 5: Env, Docs, Version

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `package.json`

- [ ] Add `SUPER_ADMIN_TELEGRAM_IDS=`.
- [ ] Document one-bot role routing.
- [ ] Bump version to the next minor patch for the feature.

### Task 6: Verification

**Files:**
- All touched files.

- [ ] Run: `npm test`
- [ ] Run: `npm run build`
- [ ] Run a small HTTP smoke check if needed.
- [ ] Confirm `git status --short`.
