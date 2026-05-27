import { Telegraf } from "telegraf";
import type { Booking } from "../domain/booking.js";
import { createBooking } from "../domain/booking.js";
import { generateSlots, parseAvailabilityText } from "../domain/availability.js";
import { shouldCaptureFeedback, type FeedbackConversationFlow } from "../domain/feedback.js";
import { normalizeLeadInput } from "../domain/lead.js";
import { createProviderProfile } from "../domain/provider.js";
import { resolveTelegramRole } from "../domain/roles.js";
import { localDateKey } from "../domain/trainer-controls.js";
import type { CrmExporter } from "../integrations/crm.js";
import type { AppDatabase } from "../storage/database.js";
import {
  buildApprovalKeyboard,
  buildSpecialistAdminKeyboard,
  buildSuperAdminKeyboard,
  copy,
  detectLanguage,
  formatBookedMessage,
  formatFeedbackCaptured,
  formatPendingBookingNotification,
  formatPaymentRequest,
  formatProviderOnboardingComplete,
  formatProviderShareLink,
  formatProviderWelcome,
  formatScheduleMessage,
  formatSpecialistAdminMenu,
  formatSlotMessage,
  formatSuperAdminMenu,
  type BotLanguage
} from "./telegram-copy.js";
import packageJson from "../../package.json" with { type: "json" };

type Step = "name" | "contact" | "topic" | "slot";

type Session = {
  step: Step;
  language: BotLanguage;
  name?: string;
  contact?: string;
  topic?: string;
  providerSlug?: string;
  slots?: Array<{ label: string; start: string; end: string }>;
};

type TrainerStep = "displayName" | "serviceName" | "bio" | "photo" | "availability";

type TrainerSession = {
  step: TrainerStep;
  language: BotLanguage;
  displayName?: string;
  serviceName?: string;
  bio?: string;
  photoRef?: string;
};

export function createTelegramBot(input: { token: string; database: AppDatabase; crm: CrmExporter; superAdminTelegramIds?: string[] }) {
  const bot = new Telegraf(input.token);
  const sessions = new Map<number, Session>();
  const trainerSessions = new Map<number, TrainerSession>();

  bot.start(async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const providerSlug = "startPayload" in ctx ? String(ctx.startPayload || "") : "";
    const provider = providerSlug ? input.database.findProviderBySlug(providerSlug) : undefined;
    const language = detectLanguage(`${ctx.from?.language_code ?? ""} ${ctx.message?.text ?? ""}`);
    sessions.set(userId, { step: "name", language, ...(provider ? { providerSlug: provider.slug } : {}) });

    if (provider) {
      if (provider.photoRef) {
        await ctx.replyWithPhoto(provider.photoRef, { caption: formatProviderWelcome(provider, language) });
      } else {
        await ctx.reply(formatProviderWelcome(provider, language));
      }
      await ctx.reply(copy(language).askName);
      return;
    }

    const ownedProvider = input.database.findProviderByTelegramUserId(String(userId));
    if (ownedProvider || (input.superAdminTelegramIds ?? []).includes(String(userId))) {
      await replyWithRoleMenu({
        userId: String(userId),
        language,
        botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
        database: input.database,
        superAdminTelegramIds: input.superAdminTelegramIds,
        reply: (message, replyMarkup) => ctx.reply(message, replyMarkup ? { reply_markup: replyMarkup } : undefined)
      });
      return;
    }

    await ctx.reply(copy(language).welcome);
  });

  bot.command("menu", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const language = detectLanguage(`${ctx.from?.language_code ?? ""} ${ctx.message.text}`);
    await replyWithRoleMenu({
      userId: String(userId),
      language,
      botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
      database: input.database,
      superAdminTelegramIds: input.superAdminTelegramIds,
      reply: (message, replyMarkup) => ctx.reply(message, replyMarkup ? { reply_markup: replyMarkup } : undefined)
    });
  });

  bot.command("link", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const language = detectLanguage(`${ctx.from?.language_code ?? ""} ${ctx.message.text}`);
    const provider = input.database.findProviderByTelegramUserId(String(userId));
    if (!provider) {
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    await ctx.reply(formatProviderShareLink(ctx.botInfo?.username ?? "slotly_ai_bot", provider.slug));
  });

  bot.command("trainer", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const language = detectLanguage(`${ctx.from?.language_code ?? ""} ${ctx.message.text}`);
    sessions.delete(userId);
    trainerSessions.set(userId, { step: "displayName", language });
    await ctx.reply(copy(language).trainerStart);
  });

  bot.command("feedback", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const text = ctx.message.text.replace(/^\/feedback(@\w+)?\s*/i, "").trim();
    const language = detectLanguage(ctx.message.text);
    if (text) {
      captureTelegramFeedback({
        database: input.database,
        botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
        telegramUserId: String(userId),
        messageText: text,
        conversationFlow: "unknown",
        screenOrStep: "feedback_command"
      });
    }
    await ctx.reply(formatFeedbackCaptured(language));
  });

  bot.command("slots", async (ctx) => {
    const provider = input.database.findProviderByTelegramUserId(String(ctx.from.id));
    const language = detectLanguage(ctx.message.text);
    if (!provider) {
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    const availabilityText = ctx.message.text.replace(/^\/slots(@\w+)?\s*/i, "").trim();
    const availability = parseAvailabilityText(availabilityText, "Europe/Paris");
    input.database.saveAvailability(availability, provider.id);
    await ctx.reply(copy(language).slotsSaved);
  });

  bot.command("today", async (ctx) => {
    const provider = input.database.findProviderByTelegramUserId(String(ctx.from.id));
    const language = detectLanguage(ctx.message.text);
    if (!provider) {
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    const today = localDateKey(new Date(), "Europe/Paris");
    await ctx.reply(formatScheduleMessage(input.database.listScheduleBookingsForDate(provider.id, today), language));
  });

  bot.command("autoapprove", async (ctx) => {
    const provider = input.database.findProviderByTelegramUserId(String(ctx.from.id));
    const language = detectLanguage(ctx.message.text);
    if (!provider) {
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    const match = ctx.message.text.replace(/^\/autoapprove(@\w+)?\s*/i, "").trim().match(/^(.+?)(?:\s+(on|off|да|нет))?$/i);
    const contact = match?.[1] ?? "";
    const mode = match?.[2] ?? "on";
    if (/^(off|нет)$/i.test(mode)) {
      input.database.deleteAutoApproval(provider.id, contact);
      await ctx.reply(copy(language).autoApproveRemoved);
      return;
    }

    input.database.createAutoApproval(provider.id, contact);
    await ctx.reply(copy(language).autoApproveSaved);
  });

  bot.command("vacation", async (ctx) => {
    const provider = input.database.findProviderByTelegramUserId(String(ctx.from.id));
    const language = detectLanguage(ctx.message.text);
    if (!provider) {
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    const text = ctx.message.text.replace(/^\/vacation(@\w+)?\s*/i, "").trim();
    input.database.createTimeOff(provider.id, text || ctx.message.text);
    await ctx.reply(copy(language).timeOffSaved);
  });

  bot.on("photo", async (ctx) => {
    const userId = ctx.from.id;
    const trainerSession = trainerSessions.get(userId);
    if (!trainerSession || trainerSession.step !== "photo") return;

    trainerSession.photoRef = ctx.message.photo.at(-1)?.file_id;
    trainerSession.step = "availability";
    trainerSessions.set(userId, trainerSession);
    await ctx.reply(copy(trainerSession.language).trainerAskAvailability);
  });

  bot.action(/^approve:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    const booking = input.database.updateBookingStatus(bookingId, "confirmed");
    const lead = input.database.findLeadById(booking.leadId);
    await ctx.answerCbQuery("Approved");
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply(`Booking approved: ${bookingId}`);
    if (lead?.telegramUserId) {
      await bot.telegram.sendMessage(lead.telegramUserId, `Ваша запись подтверждена: ${formatBookingTime(booking.start)}.`);
    }
  });

  bot.action(/^decline:(.+)$/, async (ctx) => {
    const bookingId = ctx.match[1];
    const booking = input.database.updateBookingStatus(bookingId, "declined");
    const lead = input.database.findLeadById(booking.leadId);
    await ctx.answerCbQuery("Declined");
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply(`Booking declined: ${bookingId}`);
    if (lead?.telegramUserId) {
      await bot.telegram.sendMessage(lead.telegramUserId, "К сожалению, это время не подтвердили. Попробуйте выбрать другой слот.");
    }
  });

  bot.action(/^provider:(share|slots|today|autoapprove|vacation|payment)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const provider = input.database.findProviderByTelegramUserId(String(userId));
    const language = detectLanguage(ctx.from?.language_code ?? "");
    if (!provider) {
      await ctx.answerCbQuery("Profile required");
      await ctx.reply(copy(language).providerNotFound);
      return;
    }

    await ctx.answerCbQuery();
    const action = ctx.match[1];
    if (action === "share") {
      await ctx.reply(formatProviderShareLink(ctx.botInfo?.username ?? "slotly_ai_bot", provider.slug));
      return;
    }
    if (action === "slots") {
      await ctx.reply("Напишите /slots Monday to Friday 14:00-17:00, и я обновлю свободное время.");
      return;
    }
    if (action === "today") {
      const today = localDateKey(new Date(), "Europe/Paris");
      await ctx.reply(formatScheduleMessage(input.database.listScheduleBookingsForDate(provider.id, today), language));
      return;
    }
    if (action === "autoapprove") {
      await ctx.reply("Напишите /autoapprove client@example.com on или /autoapprove client@example.com off.");
      return;
    }
    if (action === "vacation") {
      await ctx.reply("Напишите /vacation с 2026-06-01 по 2026-06-07, и я закрою эти даты для записи.");
      return;
    }
    await ctx.reply("Оплата уже заложена в архитектуру. В MVP настройки оплаты доступны через API/admin UI.");
  });

  bot.action(/^super:(providers|feedback|usage)$/, async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    if (!(input.superAdminTelegramIds ?? []).includes(String(userId))) {
      await ctx.answerCbQuery("Admin only");
      return;
    }

    await ctx.answerCbQuery();
    const action = ctx.match[1];
    if (action === "providers") {
      await ctx.reply(`Specialists: ${input.database.listProviders().length}`);
      return;
    }
    if (action === "feedback") {
      await ctx.reply(`Feedback items: ${input.database.listFeedbackItems(100).length}`);
      return;
    }
    const bookings = input.database.listBookings();
    await ctx.reply(`Total bookings: ${bookings.length}`);
  });

  bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const language = detectLanguage(text);
    const trainerSession = trainerSessions.get(userId);

    if (trainerSession) {
      captureTelegramFeedback({
        database: input.database,
        botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
        telegramUserId: String(userId),
        messageText: text,
        conversationFlow: "specialist_onboarding",
        screenOrStep: trainerSession.step
      });
      const completed = await handleTrainerText({
        text,
        userId,
        botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
        trainerSession,
        database: input.database,
        reply: (message) => ctx.reply(message)
      });
      if (completed) {
        trainerSessions.delete(userId);
      }
      return;
    }

    const session = sessions.get(userId) ?? { step: "name", language };
    session.language = session.language ?? language;
    captureTelegramFeedback({
      database: input.database,
      botUsername: ctx.botInfo?.username ?? "slotly_ai_bot",
      telegramUserId: String(userId),
      providerId: session.providerSlug
        ? input.database.findProviderBySlug(session.providerSlug)?.id
        : input.database.getDefaultProvider().id,
      messageText: text,
      conversationFlow: "client_booking",
      screenOrStep: session.step
    });

    if (session.step === "name") {
      session.name = text;
      session.step = "contact";
      sessions.set(userId, session);
      await ctx.reply(copy(session.language).askContact);
      return;
    }

    if (session.step === "contact") {
      session.contact = text;
      session.step = "topic";
      sessions.set(userId, session);
      await ctx.reply(copy(session.language).askTopic);
      return;
    }

    const provider = session.providerSlug
      ? input.database.findProviderBySlug(session.providerSlug)
      : input.database.getDefaultProvider();

    if (session.step === "topic") {
      session.topic = text;
      session.slots = generateSlots({
        availability: input.database.getAvailability(provider?.id),
        from: new Date(),
        days: 14,
        durationMinutes: provider?.sessionDurationMinutes ?? 60,
        bookedStarts: input.database.listBookings(provider?.id).map((booking) => booking.start)
      }).slice(0, 5);
      session.step = "slot";
      sessions.set(userId, session);
      await ctx.reply(formatSlotMessage(session.slots, session.language));
      return;
    }

    const index = Number(text) - 1;
    const slot = session.slots?.[index];
    if (!slot) {
      await ctx.reply(copy(session.language).chooseKnownSlot);
      return;
    }

    try {
      const lead = input.database.createLead(
        normalizeLeadInput({
          name: session.name,
          contact: session.contact,
          topic: session.topic,
          source: "telegram",
          telegramUserId: String(userId)
        }),
        provider?.id
      );
      const confirmationMode =
        provider && input.database.isClientAutoApproved(provider.id, lead.contact) ? "auto" : provider?.confirmationMode;
      let booking: Booking | undefined;
      booking = input.database.createBooking(
        createBooking({
          leadId: lead.id,
          start: slot.start,
          end: slot.end,
          existingBookings: input.database.listBookings(provider?.id),
          confirmationMode
        }),
        provider?.id
      );
      await input.crm.exportLead({ lead, booking });
      input.database.markLeadExported(lead.id);
      if (booking.status === "pending" && provider?.telegramUserId && provider.telegramUserId !== "local-admin") {
        await bot.telegram.sendMessage(
          provider.telegramUserId,
          formatPendingBookingNotification(
            {
              bookingId: booking.id,
              clientName: lead.name,
              contact: lead.contact,
              topic: lead.topic,
              slotLabel: slot.label
            },
            "ru"
          ),
          { reply_markup: buildApprovalKeyboard(booking.id, "ru") }
        );
      }
      sessions.delete(userId);
      if (provider && provider.paymentMode !== "none") {
        await ctx.reply(formatPaymentRequest(slot.label, provider.priceMinor, provider.currency, session.language));
        return;
      }
      await ctx.reply(formatBookedMessage(slot.label, booking.status, session.language));
    } catch (error) {
      await ctx.reply(error instanceof Error ? error.message : copy(session.language).bookingFailed);
    }
  });

  return bot;
}

async function handleTrainerText(input: {
  text: string;
  userId: number;
  botUsername: string;
  trainerSession: TrainerSession;
  database: AppDatabase;
  reply: (message: string) => Promise<unknown>;
}): Promise<boolean> {
  const { trainerSession } = input;

  if (trainerSession.step === "displayName") {
    trainerSession.displayName = input.text;
    trainerSession.step = "serviceName";
    await input.reply(copy(trainerSession.language).trainerAskService);
    return false;
  }

  if (trainerSession.step === "serviceName") {
    trainerSession.serviceName = input.text;
    trainerSession.step = "bio";
    await input.reply(copy(trainerSession.language).trainerAskBio);
    return false;
  }

  if (trainerSession.step === "bio") {
    trainerSession.bio = input.text;
    trainerSession.step = "photo";
    await input.reply(copy(trainerSession.language).trainerAskPhoto);
    return false;
  }

  if (trainerSession.step === "photo") {
    if (!/^skip|пропустить$/i.test(input.text)) {
      trainerSession.photoRef = input.text;
    }
    trainerSession.step = "availability";
    await input.reply(copy(trainerSession.language).trainerAskAvailability);
    return false;
  }

  const profile = createProviderProfile({
    telegramUserId: String(input.userId),
    displayName: trainerSession.displayName ?? "",
    serviceName: trainerSession.serviceName ?? "",
    bio: trainerSession.bio ?? "",
    photoRef: trainerSession.photoRef,
    confirmationMode: "manual",
    availabilityText: input.text
  });
  const provider = input.database.createProvider(profile);
  input.database.saveAvailability(parseAvailabilityText(input.text, "Europe/Paris"), provider.id);
  const shareLink = formatProviderShareLink(input.botUsername, provider.slug);
  await input.reply(formatProviderOnboardingComplete(provider.displayName, shareLink, trainerSession.language));
  return true;
}

async function replyWithRoleMenu(input: {
  userId: string;
  language: BotLanguage;
  botUsername: string;
  database: AppDatabase;
  superAdminTelegramIds?: string[];
  reply: (message: string, replyMarkup?: ReturnType<typeof buildSpecialistAdminKeyboard>) => Promise<unknown>;
}): Promise<void> {
  const ownedProvider = input.database.findProviderByTelegramUserId(input.userId);
  const role = resolveTelegramRole({
    telegramUserId: input.userId,
    superAdminTelegramIds: input.superAdminTelegramIds,
    ownedProvider
  });

  if (role.role === "super_admin") {
    await input.reply(
      formatSuperAdminMenu(
        {
          providerCount: input.database.listProviders().length,
          feedbackCount: input.database.listFeedbackItems(100).length
        },
        input.language
      ),
      buildSuperAdminKeyboard(input.language)
    );
    return;
  }

  if (ownedProvider) {
    await input.reply(
      formatSpecialistAdminMenu(
        ownedProvider,
        formatProviderShareLink(input.botUsername, ownedProvider.slug),
        input.language
      ),
      buildSpecialistAdminKeyboard(input.language)
    );
    return;
  }

  await input.reply(copy(input.language).welcome);
}

function formatBookingTime(value: string): string {
  return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Paris" });
}

function captureTelegramFeedback(input: {
  database: AppDatabase;
  botUsername: string;
  telegramUserId: string;
  providerId?: string;
  messageText: string;
  conversationFlow: FeedbackConversationFlow;
  screenOrStep: string;
}): void {
  if (!shouldCaptureFeedback(input.messageText)) return;
  input.database.createFeedbackItem({
    appVersion: packageJson.version,
    botUsername: input.botUsername,
    telegramUserId: input.telegramUserId,
    providerId: input.providerId,
    conversationFlow: input.conversationFlow,
    screenOrStep: input.screenOrStep,
    messageText: input.messageText
  });
}
