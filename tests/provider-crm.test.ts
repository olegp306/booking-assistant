import { describe, expect, it } from "vitest";
import { buildProviderCrmSnapshot } from "../src/domain/provider-crm.js";

const baseProvider = {
  id: "provider-1",
  telegramUserId: "42",
  slug: "nastya",
  displayName: "Nastya",
  serviceName: "Fitness training",
  bio: "Strength",
  sessionDurationMinutes: 60,
  confirmationMode: "manual" as const,
  availabilityText: "Monday to Friday 14:00-17:00",
  createdAt: "2026-05-22T10:00:00.000Z",
  plan: "free" as const,
  billingStatus: "trial" as const,
  usageNotificationsConsent: true,
  marketingConsent: false
};

describe("provider CRM", () => {
  it("allows upgrade prompts at the 100 booking milestone when usage notifications are enabled", () => {
    expect(buildProviderCrmSnapshot({ provider: baseProvider, bookingCount: 100 })).toEqual({
      providerId: "provider-1",
      bookingCount: 100,
      plan: "free",
      billingStatus: "trial",
      nextBookingMilestone: null,
      upgradeMilestoneReached: true,
      upgradePromptAllowed: true,
      marketingAllowed: false,
      segments: ["trial", "power_user"]
    });
  });

  it("does not allow marketing without explicit marketing consent", () => {
    const snapshot = buildProviderCrmSnapshot({
      provider: { ...baseProvider, usageNotificationsConsent: false, marketingConsent: false },
      bookingCount: 100
    });

    expect(snapshot.upgradePromptAllowed).toBe(false);
    expect(snapshot.marketingAllowed).toBe(false);
  });

  it("tracks the next booking milestone before 100 bookings", () => {
    expect(buildProviderCrmSnapshot({ provider: baseProvider, bookingCount: 42 })).toMatchObject({
      bookingCount: 42,
      nextBookingMilestone: 100,
      upgradeMilestoneReached: false,
      segments: ["trial"]
    });
  });
});
