import type { BookingStatus } from "../domain/booking.js";

export type BotLanguage = "ru" | "en";

export const telegramCopy = {
  ru: {
    welcome:
      "Привет. Я помогу быстро забронировать консультацию: уточню запрос, покажу свободные слоты и отправлю заявку на подтверждение. Как вас зовут?",
    askName: "Как вас зовут?",
    askContact: "Куда отправить подтверждение: email или телефон?",
    askTopic: "В двух словах: с чем хотите прийти?",
    chooseSlot: "Выберите удобное время и отправьте номер:",
    chooseKnownSlot: "Выберите номер слота из списка.",
    bookingFailed: "Не получилось забронировать слот. Попробуйте выбрать другое время.",
    noSlots: "Пока нет свободных слотов. Я передам заявку, и мы вернемся со временем.",
    trainerStart:
      "Давайте создадим ваш профиль. Напишите имя, которое увидят клиенты. Например: Настя.",
    trainerAskService: "Как назвать формат встречи? Например: персональная тренировка.",
    trainerAskBio: "Добавьте короткое описание: кто вы и с чем помогаете.",
    trainerAskPhoto: "Можно отправить фото профиля или написать «пропустить».",
    trainerAskAvailability: "Когда вы свободны? Например: Monday to Friday 14:00-17:00.",
    slotsSaved: "Готово, слоты обновлены.",
    autoApproveSaved: "Готово, для этого клиента включен auto-approve.",
    autoApproveRemoved: "Готово, auto-approve для этого клиента выключен.",
    timeOffSaved: "Готово, я закрыла эти даты для записи.",
    providerNotFound: "Я не нашла ваш профиль. Напишите /trainer, чтобы создать его.",
    scheduleEmpty: "Сегодня записей пока нет."
  },
  en: {
    welcome:
      "Hi. I can help you book a session: I will collect the request, show open slots, and send it for confirmation. What is your name?",
    askName: "What is your name?",
    askContact: "Where should we send the confirmation: email or phone?",
    askTopic: "In a few words, what would you like help with?",
    chooseSlot: "Choose a convenient time and send its number:",
    chooseKnownSlot: "Please choose a slot number from the list.",
    bookingFailed: "I could not book that slot. Please try another time.",
    noSlots: "There are no open slots yet. I will pass the request along and we will come back with a time.",
    trainerStart: "Let's create your profile. Send the name clients should see.",
    trainerAskService: "What should we call the meeting format?",
    trainerAskBio: "Add a short bio: who you are and how you help.",
    trainerAskPhoto: "You can send a profile photo or type 'skip'.",
    trainerAskAvailability: "When are you available? Example: Monday to Friday 14:00-17:00.",
    slotsSaved: "Done, your slots are updated.",
    autoApproveSaved: "Done, auto-approve is enabled for this client.",
    autoApproveRemoved: "Done, auto-approve is disabled for this client.",
    timeOffSaved: "Done, I blocked those dates from booking.",
    providerNotFound: "I could not find your profile. Send /trainer to create it.",
    scheduleEmpty: "No bookings today yet."
  }
} satisfies Record<BotLanguage, Record<string, string>>;

export function detectLanguage(text: string): BotLanguage {
  return /[а-яё]/i.test(text) ? "ru" : "en";
}

export function copy(language: BotLanguage = "ru") {
  return telegramCopy[language];
}

export function formatSlotMessage(slots: Array<{ label: string }>, language: BotLanguage = "ru"): string {
  if (slots.length === 0) {
    return copy(language).noSlots;
  }

  return [copy(language).chooseSlot, ...slots.map((slot, index) => `${index + 1}. ${slot.label}`)].join("\n");
}

export function formatProviderShareLink(botUsername: string, providerSlug: string): string {
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=${providerSlug}`;
}

export function formatProviderWelcome(
  provider: { displayName: string; serviceName: string; bio: string },
  language: BotLanguage = "ru"
): string {
  if (language === "en") {
    return [`You are booking with ${provider.displayName}.`, `Format: ${provider.serviceName}`, provider.bio].join("\n");
  }

  return [`Вы записываетесь к ${provider.displayName}.`, `Формат: ${provider.serviceName}`, provider.bio].join("\n");
}

export function formatProviderAssistantIntro(
  provider: { displayName: string; serviceName: string },
  faqs: Array<{ question: string; answer: string }>,
  language: BotLanguage = "ru"
): string {
  if (language === "en") {
    return [
      `I am ${provider.displayName}'s assistant. I can help you choose a time for ${provider.serviceName} and prepare for the session.`,
      faqs.map((faq) => `${faq.question} ${faq.answer}`).join("\n")
    ].join("\n\n");
  }

  return [
    `Я помощник ${possessiveRuName(provider.displayName)}. Помогу выбрать время для ${provider.serviceName} и подскажу, как подготовиться.`,
    faqs.map((faq) => `${faq.question} ${faq.answer}`).join("\n")
  ].join("\n\n");
}

export function formatProviderAssistantQuestion(question: string, index: number, total: number, language: BotLanguage = "ru"): string {
  if (language === "en") {
    return `So I can help your clients instead of making them ask you every time, please answer short question ${index + 1}/${total}:\n${question}`;
  }

  return `Чтобы я мог помогать вашим клиентам вместо того, чтобы они каждый раз спрашивали вас, ответьте на короткий вопрос ${index + 1}/${total}:\n${question}`;
}

function possessiveRuName(name: string): string {
  return name.endsWith("я") ? `${name.slice(0, -1)}и` : name;
}

export function formatPendingBookingNotification(
  input: {
    bookingId: string;
    clientName: string;
    contact: string;
    topic: string;
    slotLabel: string;
  },
  language: BotLanguage = "ru"
): string {
  if (language === "en") {
    return [
      `New booking request: ${input.clientName}`,
      `Contact: ${input.contact}`,
      `Request: ${input.topic}`,
      `Time: ${input.slotLabel}`,
      `Booking ID: ${input.bookingId}`
    ].join("\n");
  }

  return [
    `Новая заявка: ${input.clientName}`,
    `Контакт: ${input.contact}`,
    `Запрос: ${input.topic}`,
    `Время: ${input.slotLabel}`,
    `Booking ID: ${input.bookingId}`
  ].join("\n");
}

export function formatNewProviderClientNotification(
  input: { displayName: string; source: string },
  language: BotLanguage = "ru"
): string {
  if (language === "en") {
    return `New person from your booking link: ${input.displayName}. I added them to your client list.`;
  }

  return `У вас новый человек по ссылке: ${input.displayName}. Я добавила его в вашу базу клиентов.`;
}

export function buildApprovalKeyboard(bookingId: string, language: BotLanguage = "ru") {
  const approveText = language === "ru" ? "Подтвердить" : "Approve";
  const declineText = language === "ru" ? "Отклонить" : "Decline";

  return {
    inline_keyboard: [
      [
        { text: approveText, callback_data: `approve:${bookingId}` },
        { text: declineText, callback_data: `decline:${bookingId}` }
      ]
    ]
  };
}

export function formatProviderOnboardingComplete(providerName: string, shareLink: string, language: BotLanguage = "ru"): string {
  if (language === "en") {
    return `${providerName}, your profile is ready. Here is your personal client link:\n${shareLink}\nYou can share it with clients so they can see your open slots.`;
  }

  return `${providerName}, профиль готов. Вот ваша персональная ссылка для клиентов:\n${shareLink}\nЕе можно отправить ученикам, и они увидят ваши свободные слоты.`;
}

export function formatScheduleMessage(
  bookings: Array<{ clientName: string; topic: string; start: string }>,
  language: BotLanguage = "ru"
): string {
  if (bookings.length === 0) {
    return copy(language).scheduleEmpty;
  }

  const lines = bookings.map((booking) => {
    const time = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-GB", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date(booking.start));
    return `${time} - ${booking.clientName}: ${booking.topic}`;
  });

  return [language === "ru" ? "Сегодня записаны:" : "Booked today:", ...lines].join("\n");
}

export function formatBookedMessage(label: string, status: BookingStatus, language: BotLanguage = "ru"): string {
  if (language === "en") {
    return status === "confirmed"
      ? `Done, your booking is confirmed: ${label}. See you soon.`
      : `Great, I sent the request for ${label}. I will message you here once it is confirmed.`;
  }

  return status === "confirmed"
    ? `Готово, запись подтверждена: ${label}. До встречи.`
    : `Отлично, отправила заявку на ${label}. Как только слот подтвердят, я напишу вам здесь.`;
}

export function formatPaymentRequest(label: string, amountMinor: number, currency: string, language: BotLanguage = "ru"): string {
  const amount = (amountMinor / 100).toFixed(2);
  if (language === "en") {
    return `To secure ${label}, please pay ${amount} ${currency}. After payment, the booking will be confirmed automatically.`;
  }

  return `Чтобы закрепить время ${label}, оплатите ${amount} ${currency}. После оплаты запись подтвердится автоматически.`;
}

export function formatEventWelcome(
  event: { title: string; description: string; start: string; capacity: number; remainingSeats: number },
  language: BotLanguage = "ru"
): string {
  const time = new Intl.DateTimeFormat(language === "ru" ? "ru-RU" : "en-GB", {
    timeZone: "Europe/Paris",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(event.start));

  if (language === "en") {
    return [
      event.title,
      event.description,
      `When: ${time}`,
      `Seats: ${event.remainingSeats} of ${event.capacity} available`
    ].join("\n");
  }

  return [
    event.title,
    event.description,
    `Когда: ${time}`,
    `Свободно мест: ${event.remainingSeats} из ${event.capacity}`
  ].join("\n");
}

export function formatEventRegistrationNotification(
  input: { registrationId: string; eventTitle: string; participantName: string; contact: string },
  language: BotLanguage = "ru"
): string {
  if (language === "en") {
    return [
      `New event request: ${input.eventTitle}`,
      `Participant: ${input.participantName}`,
      `Contact: ${input.contact}`,
      `Registration ID: ${input.registrationId}`
    ].join("\n");
  }

  return [
    `Новая заявка на событие: ${input.eventTitle}`,
    `Участник: ${input.participantName}`,
    `Контакт: ${input.contact}`,
    `Registration ID: ${input.registrationId}`
  ].join("\n");
}

export function buildEventApprovalKeyboard(registrationId: string, language: BotLanguage = "ru") {
  const approveText = language === "ru" ? "Подтвердить место" : "Approve seat";
  const declineText = language === "ru" ? "Отклонить" : "Decline";

  return {
    inline_keyboard: [
      [
        { text: approveText, callback_data: `eventApprove:${registrationId}` },
        { text: declineText, callback_data: `eventDecline:${registrationId}` }
      ]
    ]
  };
}
