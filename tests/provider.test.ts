import { describe, expect, it } from "vitest";
import { createProviderProfile, makeProviderSlug } from "../src/domain/provider.js";

describe("provider", () => {
  it("creates stable URL-safe provider slugs", () => {
    expect(makeProviderSlug("Nastya Fitness Coach")).toBe("nastya-fitness-coach");
    expect(makeProviderSlug("  AI Консультант  ")).toBe("ai-konsultant");
  });

  it("normalizes provider profile defaults", () => {
    expect(
      createProviderProfile({
        telegramUserId: "42",
        displayName: " Nastya ",
        serviceName: " Fitness session ",
        bio: " Strength and mobility ",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
    ).toMatchObject({
      telegramUserId: "42",
      slug: "nastya",
      displayName: "Nastya",
      serviceName: "Fitness session",
      bio: "Strength and mobility",
      sessionDurationMinutes: 60,
      confirmationMode: "manual",
      paymentMode: "none",
      priceMinor: 0,
      currency: "EUR",
      platformFeeBps: 0,
      availabilityText: "Monday to Friday 14:00-17:00"
    });
  });

  it("accepts paid booking settings when the specialist opts in", () => {
    expect(
      createProviderProfile({
        telegramUserId: "100",
        displayName: "Mira",
        serviceName: "Singing lesson",
        bio: "Voice and rhythm",
        paymentMode: "full",
        priceMinor: 5000,
        currency: "EUR",
        platformFeeBps: 500,
        availabilityText: "Monday to Friday 14:00-17:00"
      })
    ).toMatchObject({
      paymentMode: "full",
      priceMinor: 5000,
      currency: "EUR",
      platformFeeBps: 500
    });
  });

  it("accepts auto confirmation and custom session duration", () => {
    expect(
      createProviderProfile({
        telegramUserId: "99",
        displayName: "Oleg",
        serviceName: "AI consult",
        bio: "Automation",
        sessionDurationMinutes: 45,
        confirmationMode: "auto",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
    ).toMatchObject({
      sessionDurationMinutes: 45,
      confirmationMode: "auto"
    });
  });
});
