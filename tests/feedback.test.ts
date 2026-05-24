import { describe, expect, it } from "vitest";
import { classifyFeedbackText, createFeedbackItem } from "../src/domain/feedback.js";

describe("feedback intelligence", () => {
  it("classifies obvious feature requests, bugs, pricing feedback, and confusion", () => {
    expect(classifyFeedbackText("Добавьте оплату абонементом, было бы удобно")).toMatchObject({
      category: "feature_request",
      sentiment: "positive",
      priority: "medium"
    });
    expect(classifyFeedbackText("Не работает кнопка записи, ошибка")).toMatchObject({
      category: "bug_report",
      sentiment: "negative",
      priority: "high"
    });
    expect(classifyFeedbackText("Дорого, подписка пока слишком высокая")).toMatchObject({
      category: "pricing_feedback",
      sentiment: "negative",
      priority: "medium"
    });
    expect(classifyFeedbackText("Не понимаю куда нажать дальше")).toMatchObject({
      category: "usability_confusion",
      sentiment: "negative",
      priority: "medium"
    });
  });

  it("creates feedback with product, user, provider, and flow context", () => {
    expect(
      createFeedbackItem({
        appVersion: "0.5.0",
        botUsername: "slotly_ai_bot",
        telegramUserId: "123",
        providerId: "provider-1",
        conversationFlow: "client_booking",
        screenOrStep: "slot",
        messageText: "Хочу абонементы для клиентов",
        now: new Date("2026-05-24T10:00:00.000Z")
      })
    ).toMatchObject({
      appVersion: "0.5.0",
      botUsername: "slotly_ai_bot",
      telegramUserId: "123",
      providerId: "provider-1",
      conversationFlow: "client_booking",
      screenOrStep: "slot",
      category: "feature_request",
      status: "new",
      summary: "Хочу абонементы для клиентов",
      createdAt: "2026-05-24T10:00:00.000Z"
    });
  });
});
