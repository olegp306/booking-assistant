import { describe, expect, it } from "vitest";
import {
  buildProviderAssistantFaqs,
  detectProviderAssistantCategory,
  getPreparationQuestions
} from "../src/domain/provider-assistant.js";

describe("provider assistant", () => {
  it("detects specialist categories from service description", () => {
    expect(detectProviderAssistantCategory("Фитнес тренер, силовые и растяжка")).toBe("fitness");
    expect(detectProviderAssistantCategory("Психолог, первая консультация")).toBe("therapy");
    expect(detectProviderAssistantCategory("Наращивание ресниц и депиляция")).toBe("beauty");
    expect(detectProviderAssistantCategory("Преподаватель вокала")).toBe("education");
    expect(detectProviderAssistantCategory("AI консультация для бизнеса")).toBe("consulting");
  });

  it("returns five practical preparation questions for a fitness trainer", () => {
    expect(getPreparationQuestions("fitness", "ru")).toEqual([
      "Как клиенту подготовиться к первой тренировке с вами?",
      "Что взять с собой на занятие?",
      "Какая одежда и обувь подойдут?",
      "Нужно ли есть до занятия, и за сколько времени?",
      "О каких ограничениях по здоровью вам важно знать заранее?"
    ]);
  });

  it("returns practical preparation questions for beauty specialists", () => {
    expect(getPreparationQuestions("beauty", "ru")).toContain("Что нельзя делать после процедуры?");
    expect(getPreparationQuestions("beauty", "ru")).toHaveLength(5);
  });

  it("normalizes provider FAQ answers with category, position, and question text", () => {
    const faqs = buildProviderAssistantFaqs({
      providerId: "provider-1",
      serviceText: "Фитнес тренер",
      answers: ["Возьмите воду", "Кроссовки", "", "Не ешьте плотно за час", "Сообщите о травмах"]
    });

    expect(faqs).toEqual([
      expect.objectContaining({
        providerId: "provider-1",
        category: "fitness",
        position: 0,
        question: "Как клиенту подготовиться к первой тренировке с вами?",
        answer: "Возьмите воду"
      }),
      expect.objectContaining({
        position: 1,
        answer: "Кроссовки"
      }),
      expect.objectContaining({
        position: 3,
        answer: "Не ешьте плотно за час"
      }),
      expect.objectContaining({
        position: 4,
        answer: "Сообщите о травмах"
      })
    ]);
  });
});
