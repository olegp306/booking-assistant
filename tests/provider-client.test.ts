import { describe, expect, it } from "vitest";
import { createProviderClient, resolveClientPrice, touchProviderClient } from "../src/domain/provider-client.js";

describe("provider client", () => {
  it("creates a new private client record for a specialist", () => {
    expect(
      createProviderClient({
        providerId: "provider-1",
        telegramUserId: "tg-1",
        displayName: "Anna",
        source: "provider_link"
      })
    ).toMatchObject({
      providerId: "provider-1",
      telegramUserId: "tg-1",
      displayName: "Anna",
      source: "provider_link",
      status: "new"
    });
  });

  it("touches an existing client without resetting status or price override", () => {
    const client = {
      ...createProviderClient({
        providerId: "provider-1",
        telegramUserId: "tg-1",
        displayName: "Anna",
        source: "provider_link"
      }),
      status: "vip" as const,
      priceOverrideMinor: 150000
    };

    expect(touchProviderClient(client, new Date("2026-05-22T10:00:00.000Z"))).toMatchObject({
      status: "vip",
      priceOverrideMinor: 150000,
      lastSeenAt: "2026-05-22T10:00:00.000Z"
    });
  });

  it("resolves personal price override before new-client and default prices", () => {
    expect(
      resolveClientPrice({
        client: { status: "new", priceOverrideMinor: 150000 },
        policy: { defaultPriceMinor: 200000, newClientPriceMinor: 250000, currency: "RUB" }
      })
    ).toEqual({ amountMinor: 150000, currency: "RUB", reason: "client_override" });
  });

  it("resolves new-client price for new clients and default price for active clients", () => {
    const policy = { defaultPriceMinor: 200000, newClientPriceMinor: 250000, currency: "RUB" };

    expect(resolveClientPrice({ client: { status: "new" }, policy })).toEqual({
      amountMinor: 250000,
      currency: "RUB",
      reason: "new_client"
    });
    expect(resolveClientPrice({ client: { status: "active" }, policy })).toEqual({
      amountMinor: 200000,
      currency: "RUB",
      reason: "default"
    });
  });
});
