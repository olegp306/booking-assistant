import cors from "cors";
import express from "express";
import { createBooking } from "../domain/booking.js";
import { generateSlots, parseAvailabilityText } from "../domain/availability.js";
import { analyzeLead } from "../domain/lead-intelligence.js";
import { normalizeLeadInput } from "../domain/lead.js";
import { buildProviderCrmSnapshot } from "../domain/provider-crm.js";
import { createProviderProfile } from "../domain/provider.js";
import type { CrmExporter } from "../integrations/crm.js";
import type { AppDatabase } from "../storage/database.js";

export function createServer(input: { database: AppDatabase; crm: CrmExporter; botUsername?: string }) {
  const botUsername = input.botUsername ?? "slotly_ai_bot";
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static("public"));

  app.get("/api/state", (request, response) => {
    const requestedSlug = String(request.query.provider ?? "default");
    const selectedProvider = input.database.findProviderBySlug(requestedSlug) ?? input.database.getDefaultProvider();
    const availability = input.database.getAvailability(selectedProvider.id);
    const bookings = input.database.listBookings(selectedProvider.id);
    const leads = input.database.listLeads(selectedProvider.id);
    const timeOffs = input.database.listTimeOffs(selectedProvider.id);
    const from = request.query.from ? new Date(String(request.query.from)) : new Date();
    const days = request.query.days ? Number(request.query.days) : 14;
    response.json({
      providers: input.database.listProviders(),
      botUsername,
      selectedProvider,
      availability,
      slots: generateSlots({
        availability,
        from,
        days,
        durationMinutes: selectedProvider.sessionDurationMinutes,
        bookedStarts: bookings.map((booking) => booking.start),
        blockedIntervals: timeOffs
      }).map((slot) => ({ ...slot, durationMinutes: selectedProvider.sessionDurationMinutes })),
      timeOffs,
      leads,
      leadInsights: Object.fromEntries(leads.map((lead) => [lead.id, analyzeLead(lead)])),
      providerCrm: buildProviderCrmSnapshot({ provider: selectedProvider, bookingCount: bookings.length }),
      bookings
    });
  });

  app.post("/api/providers", (request, response) => {
    try {
      const profile = createProviderProfile(request.body);
      const provider = input.database.createProvider(profile);
      const availability = parseAvailabilityText(profile.availabilityText, "Europe/Paris");
      input.database.saveAvailability(availability, provider.id);
      response.status(201).json({ provider });
    } catch (error) {
      response.status(400).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/providers/:slug/preferences", (request, response) => {
    try {
      const provider = input.database.updateProviderPreferences(request.params.slug, {
        plan: request.body.plan,
        billingStatus: request.body.billingStatus,
        usageNotificationsConsent:
          typeof request.body.usageNotificationsConsent === "boolean" ? request.body.usageNotificationsConsent : undefined,
        marketingConsent: typeof request.body.marketingConsent === "boolean" ? request.body.marketingConsent : undefined
      });
      response.json({ provider });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/providers/:slug/payment-settings", (request, response) => {
    try {
      const provider = input.database.updateProviderPaymentSettings(request.params.slug, {
        paymentMode: request.body.paymentMode,
        priceMinor: typeof request.body.priceMinor === "number" ? request.body.priceMinor : undefined,
        currency: request.body.currency,
        platformFeeBps: typeof request.body.platformFeeBps === "number" ? request.body.platformFeeBps : undefined
      });
      response.json({ provider });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/providers/:slug/auto-approvals", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(request.params.slug);
      if (!provider) {
        throw new Error("Provider not found.");
      }
      const autoApproval = input.database.createAutoApproval(provider.id, String(request.body.contact ?? ""));
      response.status(201).json({ autoApproval });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/providers/:slug/time-off", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(request.params.slug);
      if (!provider) {
        throw new Error("Provider not found.");
      }
      const timeOff = input.database.createTimeOff(provider.id, String(request.body.text ?? ""));
      response.status(201).json({ timeOff });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/providers/:slug/events", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(request.params.slug);
      if (!provider) {
        throw new Error("Provider not found.");
      }
      const event = input.database.createEvent({
        providerId: provider.id,
        title: String(request.body.title ?? ""),
        description: String(request.body.description ?? ""),
        start: String(request.body.start ?? ""),
        end: String(request.body.end ?? ""),
        capacity: Number(request.body.capacity ?? 0),
        approvalMode: request.body.approvalMode,
        paymentMode: request.body.paymentMode,
        priceMinor: request.body.priceMinor,
        currency: request.body.currency
      });
      response.status(201).json({ event, shareLink: `https://t.me/${botUsername}?start=event_${event.slug}` });
    } catch (error) {
      response.status(400).json({ error: errorMessage(error) });
    }
  });

  app.get("/api/events/:slug", (request, response) => {
    try {
      const event = input.database.findEventBySlug(request.params.slug);
      if (!event) {
        throw new Error("Event not found.");
      }
      response.json(eventPayload(input.database, event));
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/events/:slug/registrations", async (request, response) => {
    try {
      const event = input.database.findEventBySlug(request.params.slug);
      if (!event) {
        throw new Error("Event not found.");
      }
      const lead = input.database.createLead(normalizeLeadInput(request.body), event.providerId);
      await input.crm.exportLead({ lead });
      input.database.markLeadExported(lead.id);
      const registration = input.database.createEventRegistration(event, lead.id);
      response.status(201).json({ registration, ...eventAvailability(input.database, event) });
    } catch (error) {
      response.status(409).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/event-registrations/:id/approve", (request, response) => {
    try {
      response.json({ registration: input.database.updateEventRegistrationStatus(request.params.id, "confirmed") });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/event-registrations/:id/decline", (request, response) => {
    try {
      response.json({ registration: input.database.updateEventRegistrationStatus(request.params.id, "declined") });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.delete("/api/providers/:slug/auto-approvals", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(request.params.slug);
      if (!provider) {
        throw new Error("Provider not found.");
      }
      input.database.deleteAutoApproval(provider.id, String(request.body.contact ?? request.query.contact ?? ""));
      response.status(204).send();
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.get("/api/providers/:slug/schedule/today", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(request.params.slug);
      if (!provider) {
        throw new Error("Provider not found.");
      }
      const localDate = String(request.query.date ?? new Date().toISOString().slice(0, 10));
      response.json({ bookings: input.database.listScheduleBookingsForDate(provider.id, localDate) });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/availability", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(String(request.body.provider ?? "default")) ?? input.database.getDefaultProvider();
      const availability = parseAvailabilityText(String(request.body.text ?? ""), "Europe/Paris");
      input.database.saveAvailability(availability, provider.id);
      response.json({ availability });
    } catch (error) {
      response.status(400).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/leads", async (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(String(request.body.provider ?? "default")) ?? input.database.getDefaultProvider();
      const lead = input.database.createLead(normalizeLeadInput(request.body), provider.id);
      await input.crm.exportLead({ lead });
      input.database.markLeadExported(lead.id);
      response.status(201).json({ lead: { ...lead, exportStatus: "exported" } });
    } catch (error) {
      response.status(400).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/bookings", (request, response) => {
    try {
      const provider = input.database.findProviderBySlug(String(request.body.provider ?? "default")) ?? input.database.getDefaultProvider();
      const lead = input.database.findLeadById(String(request.body.leadId ?? ""));
      const requiresPayment = provider.paymentMode !== "none";
      const confirmationMode = requiresPayment
        ? "manual"
        : lead && input.database.isClientAutoApproved(provider.id, lead.contact)
          ? "auto"
          : provider.confirmationMode;
      const booking = createBooking({
        leadId: String(request.body.leadId ?? ""),
        start: String(request.body.start ?? ""),
        end: String(request.body.end ?? ""),
        existingBookings: input.database.listBookings(provider.id),
        confirmationMode
      });
      const storedBooking = input.database.createBooking(booking, provider.id);
      const paymentIntent = requiresPayment
        ? input.database.createPaymentIntent({
            bookingId: storedBooking.id,
            providerId: provider.id,
            amountMinor: provider.priceMinor,
            currency: provider.currency,
            platformFeeBps: provider.platformFeeBps
          })
        : undefined;
      response.status(201).json({ booking: storedBooking, ...(paymentIntent ? { paymentIntent } : {}) });
    } catch (error) {
      response.status(409).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/payments/:id/confirm", (request, response) => {
    try {
      response.json(input.database.confirmPaymentIntent(request.params.id));
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/bookings/:id/approve", (request, response) => {
    try {
      response.json({ booking: input.database.updateBookingStatus(request.params.id, "confirmed") });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  app.post("/api/bookings/:id/decline", (request, response) => {
    try {
      response.json({ booking: input.database.updateBookingStatus(request.params.id, "declined") });
    } catch (error) {
      response.status(404).json({ error: errorMessage(error) });
    }
  });

  return app;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function eventPayload(database: AppDatabase, event: NonNullable<ReturnType<AppDatabase["findEventBySlug"]>>) {
  return {
    event,
    registrations: database.listEventRegistrations(event.id),
    ...eventAvailability(database, event)
  };
}

function eventAvailability(database: AppDatabase, event: NonNullable<ReturnType<AppDatabase["findEventBySlug"]>>) {
  const registrations = database.listEventRegistrations(event.id);
  const registrationCounts = {
    pending: registrations.filter((registration) => registration.status === "pending").length,
    confirmed: registrations.filter((registration) => registration.status === "confirmed").length,
    declined: registrations.filter((registration) => registration.status === "declined").length,
    waitlisted: registrations.filter((registration) => registration.status === "waitlisted").length,
    cancelled: registrations.filter((registration) => registration.status === "cancelled").length
  };
  return {
    registrationCounts,
    remainingSeats: Math.max(0, event.capacity - registrationCounts.pending - registrationCounts.confirmed)
  };
}
