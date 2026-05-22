import { describe, expect, it } from "vitest";
import { buildLedgerEntries, createPaymentIntent, normalizePaymentSettings } from "../src/domain/payment.js";

describe("payment", () => {
  it("keeps booking free by default", () => {
    expect(normalizePaymentSettings({})).toEqual({
      paymentMode: "none",
      priceMinor: 0,
      currency: "EUR",
      platformFeeBps: 0
    });
  });

  it("requires a positive price when paid booking is enabled", () => {
    expect(() => normalizePaymentSettings({ paymentMode: "full", priceMinor: 0 })).toThrow("Paid booking requires a positive price.");
  });

  it("creates a mock payment intent for a paid booking", () => {
    expect(
      createPaymentIntent({
        bookingId: "booking-1",
        providerId: "provider-1",
        amountMinor: 5000,
        currency: "EUR"
      })
    ).toMatchObject({
      bookingId: "booking-1",
      providerId: "provider-1",
      amountMinor: 5000,
      currency: "EUR",
      status: "requires_confirmation",
      providerName: "mock"
    });
  });

  it("splits paid revenue into provider payout and platform fee", () => {
    expect(
      buildLedgerEntries({
        paymentIntentId: "payment-1",
        providerId: "provider-1",
        amountMinor: 5000,
        platformFeeBps: 500
      })
    ).toEqual([
      {
        paymentIntentId: "payment-1",
        providerId: "provider-1",
        type: "platform_fee",
        amountMinor: 250
      },
      {
        paymentIntentId: "payment-1",
        providerId: "provider-1",
        type: "provider_payout",
        amountMinor: 4750
      }
    ]);
  });
});
