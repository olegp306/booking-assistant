import { describe, expect, it } from "vitest";
import {
  buildSpecialistAdminKeyboard,
  buildSuperAdminKeyboard,
  formatSpecialistAdminMenu,
  formatSuperAdminMenu
} from "../src/bot/telegram-copy.js";

describe("telegram admin menu copy", () => {
  it("formats specialist admin menu with stable callback buttons", () => {
    expect(
      formatSpecialistAdminMenu(
        { displayName: "Nastya", serviceName: "Fitness", slug: "nastya" },
        "https://t.me/slotly_ai_bot?start=nastya",
        "en"
      )
    ).toContain("Nastya");

    expect(buildSpecialistAdminKeyboard("en")).toEqual({
      inline_keyboard: [
        [
          { text: "Client link", callback_data: "provider:share" },
          { text: "Slots", callback_data: "provider:slots" }
        ],
        [
          { text: "Today", callback_data: "provider:today" },
          { text: "Auto-approve", callback_data: "provider:autoapprove" }
        ],
        [
          { text: "Vacation", callback_data: "provider:vacation" },
          { text: "Payments", callback_data: "provider:payment" }
        ]
      ]
    });
  });

  it("formats super admin menu with platform callback buttons", () => {
    expect(formatSuperAdminMenu({ providerCount: 2, feedbackCount: 5 }, "en")).toContain("2 specialists");
    expect(buildSuperAdminKeyboard("en")).toEqual({
      inline_keyboard: [
        [
          { text: "Specialists", callback_data: "super:providers" },
          { text: "Feedback", callback_data: "super:feedback" }
        ],
        [{ text: "Usage", callback_data: "super:usage" }]
      ]
    });
  });
});
