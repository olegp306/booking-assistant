import { randomUUID } from "node:crypto";

export type PaymentMode = "none" | "deposit" | "full";
export type PaymentStatus = "requires_confirmation" | "succeeded" | "failed" | "refunded";
export type LedgerEntryType = "platform_fee" | "provider_payout";

export type PaymentSettings = {
  paymentMode: PaymentMode;
  priceMinor: number;
  currency: string;
  platformFeeBps: number;
};

export type PaymentIntent = {
  id: string;
  bookingId: string;
  providerId: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  providerName: "mock";
  platformFeeBps: number;
  createdAt: string;
};

export type LedgerEntry = {
  id?: string;
  paymentIntentId: string;
  providerId: string;
  type: LedgerEntryType;
  amountMinor: number;
  createdAt?: string;
};

export function normalizePaymentSettings(input: Partial<PaymentSettings>): PaymentSettings {
  const paymentMode = input.paymentMode ?? "none";
  const priceMinor = input.priceMinor ?? 0;
  const currency = (input.currency ?? "EUR").trim().toUpperCase();
  const platformFeeBps = input.platformFeeBps ?? (paymentMode === "none" ? 0 : 500);

  if (paymentMode !== "none" && priceMinor <= 0) {
    throw new Error("Paid booking requires a positive price.");
  }

  if (platformFeeBps < 0 || platformFeeBps > 10_000) {
    throw new Error("Platform fee must be between 0 and 10000 bps.");
  }

  return {
    paymentMode,
    priceMinor: paymentMode === "none" ? 0 : priceMinor,
    currency,
    platformFeeBps: paymentMode === "none" ? 0 : platformFeeBps
  };
}

export function createPaymentIntent(input: {
  bookingId: string;
  providerId: string;
  amountMinor: number;
  currency: string;
  platformFeeBps?: number;
}): PaymentIntent {
  if (!input.bookingId || !input.providerId || input.amountMinor <= 0) {
    throw new Error("Payment intent requires booking, provider, and a positive amount.");
  }

  return {
    id: `payment-${randomUUID()}`,
    bookingId: input.bookingId,
    providerId: input.providerId,
    amountMinor: input.amountMinor,
    currency: input.currency.trim().toUpperCase(),
    status: "requires_confirmation",
    providerName: "mock",
    platformFeeBps: input.platformFeeBps ?? 0,
    createdAt: new Date().toISOString()
  };
}

export function buildLedgerEntries(input: {
  paymentIntentId: string;
  providerId: string;
  amountMinor: number;
  platformFeeBps: number;
}): LedgerEntry[] {
  const platformFee = Math.round((input.amountMinor * input.platformFeeBps) / 10_000);
  return [
    {
      paymentIntentId: input.paymentIntentId,
      providerId: input.providerId,
      type: "platform_fee",
      amountMinor: platformFee
    },
    {
      paymentIntentId: input.paymentIntentId,
      providerId: input.providerId,
      type: "provider_payout",
      amountMinor: input.amountMinor - platformFee
    }
  ];
}
