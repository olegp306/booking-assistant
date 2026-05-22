import { describe, expect, it } from "vitest";
import {
  buildApprovalKeyboard,
  detectLanguage,
  formatBookedMessage,
  formatPendingBookingNotification,
  formatProviderOnboardingComplete,
  formatProviderShareLink,
  formatEventRegistrationNotification,
  formatEventWelcome,
  formatProviderWelcome,
  formatPaymentRequest,
  formatScheduleMessage,
  formatSlotMessage,
  telegramCopy
} from "../src/bot/telegram-copy.js";

describe("telegram copy", () => {
  it("keeps friendly Russian onboarding copy readable", () => {
    expect(telegramCopy.ru.welcome).toContain("Привет");
    expect(telegramCopy.ru.welcome).toContain("забронировать");
    expect(telegramCopy.ru.askContact).toBe("Куда отправить подтверждение: email или телефон?");
    expect(telegramCopy.ru.askTopic).toBe("В двух словах: с чем хотите прийти?");
  });

  it("detects Russian language from Cyrillic input", () => {
    expect(detectLanguage("привет, хочу записаться")).toBe("ru");
    expect(detectLanguage("hello, I want to book")).toBe("en");
  });

  it("formats slot choices for Telegram in Russian", () => {
    expect(formatSlotMessage([{ label: "Mon 25 May, 14:00" }, { label: "Tue 26 May, 15:00" }], "ru")).toBe(
      "Выберите удобное время и отправьте номер:\n1. Mon 25 May, 14:00\n2. Tue 26 May, 15:00"
    );
  });

  it("returns a clear message when no slots are available", () => {
    expect(formatSlotMessage([], "ru")).toBe("Пока нет свободных слотов. Я передам заявку, и мы вернемся со временем.");
  });

  it("formats provider share links", () => {
    expect(formatProviderShareLink("slotly_ai_bot", "nastya")).toBe("https://t.me/slotly_ai_bot?start=nastya");
  });

  it("formats provider profile welcome for clients", () => {
    expect(
      formatProviderWelcome({
        displayName: "Настя",
        serviceName: "Фитнес-тренировка",
        bio: "Силовые и мобильность"
      }, "ru")
    ).toBe("Вы записываетесь к Настя.\nФормат: Фитнес-тренировка\nСиловые и мобильность");
  });

  it("formats pending booking notification with approve and decline buttons", () => {
    expect(
      formatPendingBookingNotification({
        bookingId: "booking-1",
        clientName: "Client",
        contact: "client@example.com",
        topic: "Training",
        slotLabel: "Mon 25 May, 14:00"
      }, "ru")
    ).toBe(
      "Новая заявка: Client\nКонтакт: client@example.com\nЗапрос: Training\nВремя: Mon 25 May, 14:00\nBooking ID: booking-1"
    );

    expect(buildApprovalKeyboard("booking-1", "ru")).toEqual({
      inline_keyboard: [
        [
          { text: "Подтвердить", callback_data: "approve:booking-1" },
          { text: "Отклонить", callback_data: "decline:booking-1" }
        ]
      ]
    });
  });

  it("formats trainer onboarding completion with personal link", () => {
    expect(formatProviderOnboardingComplete("Настя", "https://t.me/slotly_ai_bot?start=nastya", "ru")).toBe(
      "Настя, профиль готов. Вот ваша персональная ссылка для клиентов:\nhttps://t.me/slotly_ai_bot?start=nastya\nЕе можно отправить ученикам, и они увидят ваши свободные слоты."
    );
  });

  it("formats today's schedule in human words", () => {
    expect(
      formatScheduleMessage(
        [
          { clientName: "Анна", topic: "Тренировка", start: "2026-05-25T12:00:00.000Z" },
          { clientName: "Олег", topic: "Мобилити", start: "2026-05-25T15:00:00.000Z" }
        ],
        "ru"
      )
    ).toBe("Сегодня записаны:\n14:00 - Анна: Тренировка\n17:00 - Олег: Мобилити");
  });

  it("formats booked message differently for pending and confirmed bookings", () => {
    expect(formatBookedMessage("Mon 25 May, 14:00", "pending", "ru")).toBe(
      "Отлично, отправила заявку на Mon 25 May, 14:00. Как только слот подтвердят, я напишу вам здесь."
    );
    expect(formatBookedMessage("Mon 25 May, 14:00", "confirmed", "ru")).toBe(
      "Готово, запись подтверждена: Mon 25 May, 14:00. До встречи."
    );
  });

  it("formats a simple paid booking request without technical payment words", () => {
    expect(formatPaymentRequest("Mon 25 May, 14:00", 5000, "EUR", "ru")).toBe(
      "Чтобы закрепить время Mon 25 May, 14:00, оплатите 50.00 EUR. После оплаты запись подтвердится автоматически."
    );
  });

  it("formats group event welcome and host approval notification", () => {
    expect(
      formatEventWelcome({
        title: "Open Singing Class",
        description: "Group voice lesson",
        start: "2026-06-20T16:00:00.000Z",
        capacity: 8,
        remainingSeats: 3
      }, "ru")
    ).toContain("Open Singing Class");

    expect(
      formatEventRegistrationNotification({
        registrationId: "event-reg-1",
        eventTitle: "Open Singing Class",
        participantName: "Participant",
        contact: "participant@example.com"
      }, "ru")
    ).toBe("Новая заявка на событие: Open Singing Class\nУчастник: Participant\nКонтакт: participant@example.com\nRegistration ID: event-reg-1");
  });
});
