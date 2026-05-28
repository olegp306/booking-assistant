import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createServer } from "../src/http/server.js";
import { createDatabase, type AppDatabase } from "../src/storage/database.js";
import type { CrmExporter } from "../src/integrations/crm.js";

const databases: AppDatabase[] = [];

describe("http api", () => {
  afterEach(() => {
    while (databases.length > 0) {
      databases.pop()?.close();
    }
  });

  it("returns default availability and generated slots", async () => {
    const app = appWithMemoryDatabase();

    const response = await request(app).get("/api/state").expect(200);

    expect(response.body.availability.originalText).toBe("Monday to Friday 14:00-17:00");
    expect(response.body.slots.length).toBeGreaterThan(0);
    expect(response.body.leads).toEqual([]);
    expect(response.body.bookings).toEqual([]);
    expect(response.body.providers.length).toBe(1);
    expect(response.body.selectedProvider.slug).toBe("default");
    expect(response.body.botUsername).toBe("slotly_ai_bot");
  });

  it("creates providers and scopes state by provider slug", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-1",
        displayName: "Nastya",
        serviceName: "Fitness training",
        bio: "Strength and mobility",
        sessionDurationMinutes: 45,
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    expect(providerResponse.body.provider).toMatchObject({
      slug: "nastya",
      displayName: "Nastya",
      serviceName: "Fitness training",
      confirmationMode: "manual"
    });

    const stateResponse = await request(app).get("/api/state?provider=nastya").expect(200);

    expect(stateResponse.body.selectedProvider.slug).toBe("nastya");
    expect(stateResponse.body.slots[0]).toMatchObject({ durationMinutes: 45 });
    expect(stateResponse.body.providerCrm).toMatchObject({
      providerId: providerResponse.body.provider.id,
      bookingCount: 0,
      plan: "free",
      billingStatus: "trial",
      upgradePromptAllowed: false,
      marketingAllowed: false
    });
  });

  it("stores provider assistant FAQ answers and exposes them only for the selected provider", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-faq",
        displayName: "Nastya",
        serviceName: "Фитнес тренер",
        bio: "Силовые и растяжка",
        availabilityText: "Monday to Friday 14:00-17:00",
        assistantFaqAnswers: [
          "Возьмите воду и приходите за пять минут.",
          "Кроссовки, полотенце и бутылку воды.",
          "Удобная спортивная одежда.",
          "Не ешьте плотно за час до занятия.",
          "Напишите о травмах заранее."
        ]
      })
      .expect(201);

    const otherProvider = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "beauty-faq",
        displayName: "Lena",
        serviceName: "Наращивание ресниц",
        bio: "Beauty",
        availabilityText: "Monday to Friday 14:00-17:00",
        assistantFaqAnswers: ["Приходите без макияжа."]
      })
      .expect(201);

    const stateResponse = await request(app).get(`/api/state?provider=${providerResponse.body.provider.slug}`).expect(200);
    const otherState = await request(app).get(`/api/state?provider=${otherProvider.body.provider.slug}`).expect(200);

    expect(stateResponse.body.providerAssistantFaqs).toHaveLength(5);
    expect(stateResponse.body.providerAssistantFaqs[0]).toMatchObject({
      providerId: providerResponse.body.provider.id,
      category: "fitness",
      question: "Как клиенту подготовиться к первой тренировке с вами?",
      answer: "Возьмите воду и приходите за пять минут."
    });
    expect(otherState.body.providerAssistantFaqs).toHaveLength(1);
    expect(otherState.body.providerAssistantFaqs[0].providerId).toBe(otherProvider.body.provider.id);
  });

  it("updates provider CRM preferences and exposes consent-aware usage state", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-crm",
        displayName: "CRM Coach",
        serviceName: "Training",
        bio: "Strength",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    await request(app)
      .post(`/api/providers/${providerResponse.body.provider.slug}/preferences`)
      .send({ marketingConsent: true, usageNotificationsConsent: true, plan: "free", billingStatus: "trial" })
      .expect(200);

    const stateResponse = await request(app).get(`/api/state?provider=${providerResponse.body.provider.slug}`).expect(200);

    expect(stateResponse.body.selectedProvider).toMatchObject({
      marketingConsent: true,
      usageNotificationsConsent: true,
      plan: "free",
      billingStatus: "trial"
    });
    expect(stateResponse.body.providerCrm.marketingAllowed).toBe(true);
  });

  it("keeps specialist client CRM private by provider and applies pricing policy", async () => {
    const app = appWithMemoryDatabase();
    const firstProvider = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "specialist-clients-1",
        displayName: "First Specialist",
        serviceName: "Singing",
        bio: "Voice",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const secondProvider = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "specialist-clients-2",
        displayName: "Second Specialist",
        serviceName: "Dance",
        bio: "Movement",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    await request(app)
      .post(`/api/providers/${firstProvider.body.provider.slug}/pricing-policy`)
      .send({ defaultPriceMinor: 200000, newClientPriceMinor: 250000, currency: "RUB" })
      .expect(200);

    await request(app)
      .post(`/api/providers/${firstProvider.body.provider.slug}/clients`)
      .send({ telegramUserId: "tg-client", displayName: "Anna", source: "provider_link" })
      .expect(201);
    await request(app)
      .post(`/api/providers/${secondProvider.body.provider.slug}/clients`)
      .send({ telegramUserId: "tg-client", displayName: "Anna", source: "provider_link" })
      .expect(201);

    const firstClients = await request(app).get(`/api/providers/${firstProvider.body.provider.slug}/clients`).expect(200);
    const secondClients = await request(app).get(`/api/providers/${secondProvider.body.provider.slug}/clients`).expect(200);

    expect(firstClients.body.clients).toHaveLength(1);
    expect(secondClients.body.clients).toHaveLength(1);
    expect(firstClients.body.clients[0].providerId).toBe(firstProvider.body.provider.id);
    expect(secondClients.body.clients[0].providerId).toBe(secondProvider.body.provider.id);
    expect(firstClients.body.clients[0].pricePreview).toEqual({
      amountMinor: 250000,
      currency: "RUB",
      reason: "new_client"
    });

    const updatedClient = await request(app)
      .post(`/api/providers/${firstProvider.body.provider.slug}/clients/${firstClients.body.clients[0].id}`)
      .send({ status: "active", priceOverrideMinor: 150000, notes: "Long-term student" })
      .expect(200);

    expect(updatedClient.body.client).toMatchObject({
      providerId: firstProvider.body.provider.id,
      status: "active",
      notes: "Long-term student",
      pricePreview: {
        amountMinor: 150000,
        currency: "RUB",
        reason: "client_override"
      }
    });

    const firstState = await request(app).get(`/api/state?provider=${firstProvider.body.provider.slug}`).expect(200);
    expect(firstState.body.providerClients).toHaveLength(1);
    expect(firstState.body.providerClients[0]).toMatchObject({
      providerId: firstProvider.body.provider.id,
      displayName: "Anna",
      status: "active"
    });
  });

  it("updates specialist payment settings without changing the free default", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "specialist-payment",
        displayName: "Singing Teacher",
        serviceName: "Singing lesson",
        bio: "Voice basics",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    expect(providerResponse.body.provider).toMatchObject({
      paymentMode: "none",
      priceMinor: 0,
      currency: "EUR"
    });

    await request(app)
      .post(`/api/providers/${providerResponse.body.provider.slug}/payment-settings`)
      .send({ paymentMode: "full", priceMinor: 5000, currency: "EUR", platformFeeBps: 500 })
      .expect(200);

    const stateResponse = await request(app).get(`/api/state?provider=${providerResponse.body.provider.slug}`).expect(200);

    expect(stateResponse.body.selectedProvider).toMatchObject({
      paymentMode: "full",
      priceMinor: 5000,
      currency: "EUR",
      platformFeeBps: 500
    });
  });

  it("creates a lead and exports it through the CRM boundary", async () => {
    const exported: unknown[] = [];
    const app = appWithMemoryDatabase({
      exportLead: async (payload) => {
        exported.push(payload);
      }
    });

    const response = await request(app)
      .post("/api/leads")
      .send({ name: "Ada", contact: "ada@example.com", topic: "AI intake", source: "manual" })
      .expect(201);

    expect(response.body.lead).toMatchObject({
      name: "Ada",
      contact: "ada@example.com",
      topic: "AI intake",
      source: "manual",
      exportStatus: "exported"
    });
    expect(exported).toHaveLength(1);
  });

  it("returns lead intelligence in state", async () => {
    const app = appWithMemoryDatabase();
    const leadResponse = await request(app)
      .post("/api/leads")
      .send({ name: "Ada", contact: "ADA@EXAMPLE.COM", topic: "AI automation", source: "manual" })
      .expect(201);

    const stateResponse = await request(app).get("/api/state").expect(200);

    expect(stateResponse.body.leadInsights[leadResponse.body.lead.id]).toEqual({
      contactKind: "email",
      normalizedContact: "ada@example.com",
      missingFields: [],
      temperature: "hot",
      crmNotes: ["contact:email", "temperature:hot"]
    });
  });

  it("creates a booking and rejects a duplicate slot", async () => {
    const app = appWithMemoryDatabase();
    const leadResponse = await request(app)
      .post("/api/leads")
      .send({ name: "Grace", contact: "grace@example.com", topic: "AI strategy", source: "manual" })
      .expect(201);
    const stateResponse = await request(app).get("/api/state").expect(200);
    const slot = stateResponse.body.slots[0];

    await request(app)
      .post("/api/bookings")
      .send({ leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(201);

    const conflictResponse = await request(app)
      .post("/api/bookings")
      .send({ leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(409);

    expect(conflictResponse.body.error).toBe("This slot is already booked.");
  });

  it("keeps unpaid specialist booking simple and creates paid bookings through mock payment", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "paid-specialist",
        displayName: "Paid Singing Teacher",
        serviceName: "Singing lesson",
        bio: "Voice basics",
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;

    await request(app)
      .post(`/api/providers/${provider.slug}/payment-settings`)
      .send({ paymentMode: "full", priceMinor: 5000, currency: "EUR", platformFeeBps: 500 })
      .expect(200);

    const leadResponse = await request(app)
      .post("/api/leads")
      .send({ provider: provider.slug, name: "Singer", contact: "singer@example.com", topic: "Lesson", source: "manual" })
      .expect(201);
    const stateResponse = await request(app).get(`/api/state?provider=${provider.slug}`).expect(200);
    const slot = stateResponse.body.slots[0];

    const bookingResponse = await request(app)
      .post("/api/bookings")
      .send({ provider: provider.slug, leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(201);

    expect(bookingResponse.body.booking.status).toBe("pending");
    expect(bookingResponse.body.paymentIntent).toMatchObject({
      bookingId: bookingResponse.body.booking.id,
      amountMinor: 5000,
      currency: "EUR",
      status: "requires_confirmation"
    });

    const paymentResponse = await request(app).post(`/api/payments/${bookingResponse.body.paymentIntent.id}/confirm`).expect(200);

    expect(paymentResponse.body.paymentIntent.status).toBe("succeeded");
    expect(paymentResponse.body.booking.status).toBe("confirmed");
    expect(paymentResponse.body.ledgerEntries).toEqual([
      expect.objectContaining({ type: "platform_fee", amountMinor: 250 }),
      expect.objectContaining({ type: "provider_payout", amountMinor: 4750 })
    ]);
  });

  it("uses a known provider client price when creating a paid booking", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "paid-client-specialist",
        displayName: "Paid Coach",
        serviceName: "Coaching",
        bio: "Practice",
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;

    await request(app)
      .post(`/api/providers/${provider.slug}/payment-settings`)
      .send({ paymentMode: "full", priceMinor: 100000, currency: "RUB", platformFeeBps: 500 })
      .expect(200);
    await request(app)
      .post(`/api/providers/${provider.slug}/pricing-policy`)
      .send({ defaultPriceMinor: 200000, newClientPriceMinor: 250000, currency: "RUB" })
      .expect(200);
    await request(app)
      .post(`/api/providers/${provider.slug}/clients`)
      .send({ telegramUserId: "tg-priced-client", displayName: "Anna", source: "provider_link", priceOverrideMinor: 150000 })
      .expect(201);

    const leadResponse = await request(app)
      .post("/api/leads")
      .send({
        provider: provider.slug,
        telegramUserId: "tg-priced-client",
        name: "Anna",
        contact: "anna@example.com",
        topic: "Coaching",
        source: "telegram"
      })
      .expect(201);
    const stateResponse = await request(app).get(`/api/state?provider=${provider.slug}`).expect(200);
    const slot = stateResponse.body.slots[0];

    const bookingResponse = await request(app)
      .post("/api/bookings")
      .send({ provider: provider.slug, leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(201);

    expect(bookingResponse.body.pricePreview).toEqual({
      amountMinor: 150000,
      currency: "RUB",
      reason: "client_override"
    });
    expect(bookingResponse.body.paymentIntent).toMatchObject({
      amountMinor: 150000,
      currency: "RUB"
    });
  });

  it("approves and declines pending bookings", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-approval",
        displayName: "Approval Coach",
        serviceName: "Fitness training",
        bio: "Strength",
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;
    const leadResponse = await request(app)
      .post("/api/leads")
      .send({ provider: provider.slug, name: "Client", contact: "client@example.com", topic: "Training", source: "manual" })
      .expect(201);
    const stateResponse = await request(app).get(`/api/state?provider=${provider.slug}`).expect(200);
    const slot = stateResponse.body.slots[0];

    const bookingResponse = await request(app)
      .post("/api/bookings")
      .send({ provider: provider.slug, leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(201);

    expect(bookingResponse.body.booking.status).toBe("pending");

    const approved = await request(app).post(`/api/bookings/${bookingResponse.body.booking.id}/approve`).expect(200);
    expect(approved.body.booking.status).toBe("confirmed");

    const secondSlot = stateResponse.body.slots[1];
    const secondBooking = await request(app)
      .post("/api/bookings")
      .send({ provider: provider.slug, leadId: leadResponse.body.lead.id, start: secondSlot.start, end: secondSlot.end })
      .expect(201);
    const declined = await request(app).post(`/api/bookings/${secondBooking.body.booking.id}/decline`).expect(200);
    expect(declined.body.booking.status).toBe("declined");
  });

  it("auto-approves a specific client and returns today's trainer schedule", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-auto",
        displayName: "Nastya Auto",
        serviceName: "Fitness training",
        bio: "Strength",
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;

    await request(app)
      .post(`/api/providers/${provider.slug}/auto-approvals`)
      .send({ contact: " Client@Example.COM " })
      .expect(201);

    const leadResponse = await request(app)
      .post("/api/leads")
      .send({ provider: provider.slug, name: "Auto Client", contact: "client@example.com", topic: "Training", source: "manual" })
      .expect(201);
    const stateResponse = await request(app).get(`/api/state?provider=${provider.slug}`).expect(200);
    const slot = stateResponse.body.slots[0];

    const bookingResponse = await request(app)
      .post("/api/bookings")
      .send({ provider: provider.slug, leadId: leadResponse.body.lead.id, start: slot.start, end: slot.end })
      .expect(201);

    expect(bookingResponse.body.booking.status).toBe("confirmed");

    const scheduleResponse = await request(app)
      .get(`/api/providers/${provider.slug}/schedule/today?date=${slot.start.slice(0, 10)}`)
      .expect(200);

    expect(scheduleResponse.body.bookings).toHaveLength(1);
    expect(scheduleResponse.body.bookings[0]).toMatchObject({
      clientName: "Auto Client",
      topic: "Training",
      status: "confirmed"
    });
  });

  it("blocks slots while a provider is on vacation", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-vacation",
        displayName: "Vacation Coach",
        serviceName: "Fitness training",
        bio: "Strength",
        confirmationMode: "manual",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;

    await request(app)
      .post(`/api/providers/${provider.slug}/time-off`)
      .send({ text: "у меня отпуск с 2026-06-01 по 2026-06-01" })
      .expect(201);

    const stateResponse = await request(app)
      .get(`/api/state?provider=${provider.slug}&from=2026-06-01T00:00:00.000Z&days=2`)
      .expect(200);

    expect(stateResponse.body.timeOffs).toHaveLength(1);
    expect(stateResponse.body.slots.map((slot: { label: string }) => slot.label)).toEqual([
      "Tue 02 Jun, 14:00",
      "Tue 02 Jun, 15:00",
      "Tue 02 Jun, 16:00"
    ]);
  });

  it("creates a group event, registers a participant, and lets the host approve", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "event-host",
        displayName: "Event Host",
        serviceName: "Singing",
        bio: "Group classes",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);
    const provider = providerResponse.body.provider;

    const eventResponse = await request(app)
      .post(`/api/providers/${provider.slug}/events`)
      .send({
        title: "Open Singing Class",
        description: "Group voice lesson",
        start: "2026-06-20T16:00:00.000Z",
        end: "2026-06-20T18:00:00.000Z",
        capacity: 2
      })
      .expect(201);

    expect(eventResponse.body.event).toMatchObject({
      slug: "open-singing-class",
      capacity: 2,
      approvalMode: "manual"
    });
    expect(eventResponse.body.shareLink).toBe("https://t.me/slotly_ai_bot?start=event_open-singing-class");

    const registrationResponse = await request(app)
      .post(`/api/events/${eventResponse.body.event.slug}/registrations`)
      .send({ name: "Participant", contact: "participant@example.com", topic: "Wants to sing", source: "manual" })
      .expect(201);

    expect(registrationResponse.body.registration.status).toBe("pending");
    expect(registrationResponse.body.remainingSeats).toBe(1);

    const approved = await request(app)
      .post(`/api/event-registrations/${registrationResponse.body.registration.id}/approve`)
      .expect(200);

    expect(approved.body.registration.status).toBe("confirmed");

    const eventState = await request(app).get(`/api/events/${eventResponse.body.event.slug}`).expect(200);
    expect(eventState.body.registrationCounts).toEqual({ pending: 0, confirmed: 1, declined: 0, waitlisted: 0, cancelled: 0 });
    expect(eventState.body.remainingSeats).toBe(1);
  });

  it("returns current Telegram role in state", async () => {
    const app = appWithMemoryDatabase(undefined, { superAdminTelegramIds: ["super-1"] });
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "trainer-role",
        displayName: "Role Coach",
        serviceName: "Training",
        bio: "Strength",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    const specialistState = await request(app).get("/api/state?telegramUserId=trainer-role").expect(200);
    expect(specialistState.body.currentUserRole).toEqual({
      role: "specialist_admin",
      providerId: providerResponse.body.provider.id,
      providerSlug: providerResponse.body.provider.slug
    });

    const superAdminState = await request(app).get("/api/state?telegramUserId=super-1").expect(200);
    expect(superAdminState.body.currentUserRole).toEqual({ role: "super_admin" });
  });

  it("creates, lists, and triages product feedback with version and flow context", async () => {
    const app = appWithMemoryDatabase();
    const providerResponse = await request(app)
      .post("/api/providers")
      .send({
        telegramUserId: "feedback-provider",
        displayName: "Feedback Coach",
        serviceName: "Training",
        bio: "Strength",
        availabilityText: "Monday to Friday 14:00-17:00"
      })
      .expect(201);

    const created = await request(app)
      .post("/api/feedback")
      .send({
        botUsername: "slotly_ai_bot",
        telegramUserId: "tg-feedback",
        providerId: providerResponse.body.provider.id,
        conversationFlow: "client_booking",
        screenOrStep: "slot",
        messageText: "add subscription payment please"
      })
      .expect(201);

    expect(created.body.feedback).toMatchObject({
      appVersion: expect.any(String),
      category: "pricing_feedback",
      status: "new",
      providerId: providerResponse.body.provider.id,
      conversationFlow: "client_booking"
    });

    const list = await request(app).get("/api/feedback").expect(200);
    expect(list.body.feedbackItems).toHaveLength(1);

    const updated = await request(app).post(`/api/feedback/${created.body.feedback.id}/status`).send({ status: "planned" }).expect(200);
    expect(updated.body.feedback.status).toBe("planned");
  });
});

function appWithMemoryDatabase(
  crm: CrmExporter = { exportLead: async () => undefined },
  options: { superAdminTelegramIds?: string[]; botUsername?: string } = {}
) {
  const database = createDatabase(":memory:");
  databases.push(database);
  return createServer({ database, crm, ...options });
}
