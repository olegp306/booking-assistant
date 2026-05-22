import { randomUUID } from "node:crypto";

export type ProviderClientStatus = "new" | "active" | "vip" | "paused" | "blocked";
export type ProviderClientSource = "provider_link" | "manual" | "booking" | "event";

export type ProviderClient = {
  id: string;
  providerId: string;
  telegramUserId?: string;
  leadId?: string;
  displayName: string;
  status: ProviderClientStatus;
  source: ProviderClientSource;
  priceOverrideMinor?: number;
  notes?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type ProviderPricingPolicy = {
  providerId: string;
  defaultPriceMinor: number;
  newClientPriceMinor: number;
  currency: string;
};

export type ClientPricePreview = {
  amountMinor: number;
  currency: string;
  reason: "client_override" | "new_client" | "default";
};

export function createProviderClient(input: {
  providerId: string;
  telegramUserId?: string;
  leadId?: string;
  displayName: string;
  source?: ProviderClientSource;
  priceOverrideMinor?: number;
  notes?: string;
  now?: Date;
}): ProviderClient {
  const providerId = input.providerId.trim();
  const displayName = input.displayName.trim();
  if (!providerId) {
    throw new Error("Provider is required.");
  }
  if (!displayName) {
    throw new Error("Client name is required.");
  }

  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    id: `provider-client-${randomUUID()}`,
    providerId,
    telegramUserId: cleanOptional(input.telegramUserId),
    leadId: cleanOptional(input.leadId),
    displayName,
    status: "new",
    source: input.source ?? "provider_link",
    priceOverrideMinor: normalizePrice(input.priceOverrideMinor),
    notes: cleanOptional(input.notes),
    firstSeenAt: timestamp,
    lastSeenAt: timestamp
  };
}

export function touchProviderClient<T extends Pick<ProviderClient, "lastSeenAt">>(client: T, now = new Date()): T {
  return {
    ...client,
    lastSeenAt: now.toISOString()
  };
}

export function resolveClientPrice(input: {
  client: Pick<ProviderClient, "status" | "priceOverrideMinor">;
  policy: Pick<ProviderPricingPolicy, "defaultPriceMinor" | "newClientPriceMinor" | "currency">;
}): ClientPricePreview {
  if (typeof input.client.priceOverrideMinor === "number") {
    return {
      amountMinor: input.client.priceOverrideMinor,
      currency: input.policy.currency,
      reason: "client_override"
    };
  }

  if (input.client.status === "new") {
    return {
      amountMinor: input.policy.newClientPriceMinor,
      currency: input.policy.currency,
      reason: "new_client"
    };
  }

  return {
    amountMinor: input.policy.defaultPriceMinor,
    currency: input.policy.currency,
    reason: "default"
  };
}

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePrice(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Client price must be a non-negative number.");
  }
  return Math.round(value);
}
