import type { ProviderBillingStatus, ProviderPlan } from "./provider.js";
import type { StoredProvider } from "../storage/database.js";

export type { ProviderBillingStatus, ProviderPlan };
export type ProviderSegment = "trial" | "customer" | "power_user" | "at_risk";

export type ProviderCrmSnapshot = {
  providerId: string;
  bookingCount: number;
  plan: ProviderPlan;
  billingStatus: ProviderBillingStatus;
  nextBookingMilestone: number | null;
  upgradeMilestoneReached: boolean;
  upgradePromptAllowed: boolean;
  marketingAllowed: boolean;
  segments: ProviderSegment[];
};

export function buildProviderCrmSnapshot(input: {
  provider: Pick<
    StoredProvider,
    "id" | "plan" | "billingStatus" | "usageNotificationsConsent" | "marketingConsent"
  >;
  bookingCount: number;
}): ProviderCrmSnapshot {
  const upgradeMilestoneReached = input.bookingCount >= 100;
  const isPaying = input.provider.plan === "pro" || input.provider.billingStatus === "active";
  const segments: ProviderSegment[] = [];

  if (input.provider.billingStatus === "trial") {
    segments.push("trial");
  } else if (isPaying) {
    segments.push("customer");
  }

  if (input.provider.billingStatus === "past_due" || input.provider.billingStatus === "cancelled") {
    segments.push("at_risk");
  }

  if (upgradeMilestoneReached) {
    segments.push("power_user");
  }

  return {
    providerId: input.provider.id,
    bookingCount: input.bookingCount,
    plan: input.provider.plan,
    billingStatus: input.provider.billingStatus,
    nextBookingMilestone: upgradeMilestoneReached ? null : 100,
    upgradeMilestoneReached,
    upgradePromptAllowed: upgradeMilestoneReached && !isPaying && input.provider.usageNotificationsConsent,
    marketingAllowed: input.provider.marketingConsent,
    segments
  };
}
