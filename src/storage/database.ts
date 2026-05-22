import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import type { Booking } from "../domain/booking.js";
import type { AvailabilityRule, ParsedAvailability } from "../domain/availability.js";
import type { NormalizedLead } from "../domain/lead.js";
import {
  buildLedgerEntries,
  createPaymentIntent,
  normalizePaymentSettings,
  type LedgerEntry,
  type PaymentIntent,
  type PaymentMode
} from "../domain/payment.js";
import {
  canAcceptRegistration,
  createEvent,
  createEventRegistration,
  type Event,
  type EventInput,
  type EventRegistration,
  type EventRegistrationStatus
} from "../domain/event.js";
import { parseTimeOffText, type TimeOffBlock } from "../domain/time-off.js";
import { isSameLocalDate, normalizeAutoApprovalContact, type ScheduleBooking } from "../domain/trainer-controls.js";
import type { ConfirmationMode, ProviderBillingStatus, ProviderPlan, ProviderProfile } from "../domain/provider.js";

export type StoredLead = NormalizedLead & {
  id: string;
  providerId: string;
  createdAt: string;
  exportStatus: "pending" | "exported";
};

export type StoredProvider = ProviderProfile & {
  id: string;
  createdAt: string;
};

export type AppDatabase = ReturnType<typeof createDatabase>;

export function createDatabase(path = "slotly-ai.sqlite") {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  migrate(db);
  ensureDefaultProvider(db);

  return {
    close: () => db.close(),
    getDefaultProvider(): StoredProvider {
      return mapProvider(
        db.prepare("select * from providers where slug = 'default'").get() as ProviderRow
      );
    },
    listProviders(): StoredProvider[] {
      const rows = db.prepare("select * from providers order by created_at asc").all() as ProviderRow[];
      return rows.map(mapProvider);
    },
    findProviderBySlug(slug: string): StoredProvider | undefined {
      const row = db.prepare("select * from providers where slug = ?").get(slug) as ProviderRow | undefined;
      return row ? mapProvider(row) : undefined;
    },
    findProviderByTelegramUserId(telegramUserId: string): StoredProvider | undefined {
      const row = db.prepare("select * from providers where telegram_user_id = ? order by created_at desc limit 1").get(telegramUserId) as
        | ProviderRow
        | undefined;
      return row ? mapProvider(row) : undefined;
    },
    createProvider(input: ProviderProfile): StoredProvider {
      const provider: StoredProvider = {
        id: `provider-${randomUUID()}`,
        ...input,
        createdAt: now()
      };
      db.prepare(
        `insert into providers (
          id, telegram_user_id, slug, display_name, service_name, bio, photo_ref,
          session_duration_minutes, confirmation_mode, plan, billing_status,
          usage_notifications_consent, marketing_consent, payment_mode, price_minor,
          currency, platform_fee_bps, created_at
        ) values (
          @id, @telegramUserId, @slug, @displayName, @serviceName, @bio, @photoRef,
          @sessionDurationMinutes, @confirmationMode, @plan, @billingStatus,
          @usageNotificationsConsent, @marketingConsent, @paymentMode, @priceMinor,
          @currency, @platformFeeBps, @createdAt
        )`
      ).run({
        ...provider,
        photoRef: provider.photoRef ?? null,
        usageNotificationsConsent: provider.usageNotificationsConsent ? 1 : 0,
        marketingConsent: provider.marketingConsent ? 1 : 0
      });
      return provider;
    },
    updateProviderPaymentSettings(
      slug: string,
      input: Partial<Pick<StoredProvider, "paymentMode" | "priceMinor" | "currency" | "platformFeeBps">>
    ): StoredProvider {
      const existing = this.findProviderBySlug(slug);
      if (!existing) {
        throw new Error("Provider not found.");
      }
      const next = normalizePaymentSettings({
        paymentMode: input.paymentMode ?? existing.paymentMode,
        priceMinor: input.priceMinor ?? existing.priceMinor,
        currency: input.currency ?? existing.currency,
        platformFeeBps: input.platformFeeBps ?? existing.platformFeeBps
      });
      db.prepare(
        `update providers
         set payment_mode = @paymentMode,
             price_minor = @priceMinor,
             currency = @currency,
             platform_fee_bps = @platformFeeBps
         where slug = @slug`
      ).run({ slug, ...next });
      return this.findProviderBySlug(slug) as StoredProvider;
    },
    updateProviderPreferences(
      slug: string,
      input: Partial<Pick<StoredProvider, "plan" | "billingStatus" | "usageNotificationsConsent" | "marketingConsent">>
    ): StoredProvider {
      const existing = this.findProviderBySlug(slug);
      if (!existing) {
        throw new Error("Provider not found.");
      }
      const next = {
        plan: input.plan ?? existing.plan,
        billingStatus: input.billingStatus ?? existing.billingStatus,
        usageNotificationsConsent: input.usageNotificationsConsent ?? existing.usageNotificationsConsent,
        marketingConsent: input.marketingConsent ?? existing.marketingConsent
      };
      db.prepare(
        `update providers
         set plan = @plan,
             billing_status = @billingStatus,
             usage_notifications_consent = @usageNotificationsConsent,
             marketing_consent = @marketingConsent
         where slug = @slug`
      ).run({
        slug,
        ...next,
        usageNotificationsConsent: next.usageNotificationsConsent ? 1 : 0,
        marketingConsent: next.marketingConsent ? 1 : 0
      });
      return this.findProviderBySlug(slug) as StoredProvider;
    },
    createAutoApproval(providerId: string, contact: string): { providerId: string; contact: string; createdAt: string } {
      const normalizedContact = normalizeAutoApprovalContact(contact);
      if (!normalizedContact) {
        throw new Error("Client contact is required.");
      }
      const autoApproval = { providerId, contact: normalizedContact, createdAt: now() };
      db.prepare(
        `insert into auto_approvals (provider_id, contact, created_at)
         values (@providerId, @contact, @createdAt)
         on conflict(provider_id, contact) do nothing`
      ).run(autoApproval);
      return autoApproval;
    },
    deleteAutoApproval(providerId: string, contact: string): void {
      db.prepare("delete from auto_approvals where provider_id = ? and contact = ?").run(
        providerId,
        normalizeAutoApprovalContact(contact)
      );
    },
    isClientAutoApproved(providerId: string, contact: string): boolean {
      const row = db.prepare("select contact from auto_approvals where provider_id = ? and contact = ?").get(
        providerId,
        normalizeAutoApprovalContact(contact)
      );
      return Boolean(row);
    },
    createTimeOff(providerId: string, text: string): Required<TimeOffBlock> {
      const parsed = parseTimeOffText(text);
      const timeOff = {
        id: `time-off-${randomUUID()}`,
        providerId,
        ...parsed,
        createdAt: now()
      };
      db.prepare(
        `insert into time_offs (id, provider_id, reason, start_at, end_at, created_at)
         values (@id, @providerId, @reason, @start, @end, @createdAt)`
      ).run(timeOff);
      return timeOff;
    },
    listTimeOffs(providerId: string): Required<TimeOffBlock>[] {
      const rows = db.prepare("select * from time_offs where provider_id = ? order by start_at asc").all(providerId) as TimeOffRow[];
      return rows.map(mapTimeOff);
    },
    createEvent(input: Omit<EventInput, "providerId"> & { providerId: string }): Event {
      const event = createEvent(input);
      db.prepare(
        `insert into events (
          id, provider_id, slug, title, description, start_at, end_at, capacity,
          approval_mode, payment_mode, price_minor, currency, created_at
        ) values (
          @id, @providerId, @slug, @title, @description, @start, @end, @capacity,
          @approvalMode, @paymentMode, @priceMinor, @currency, @createdAt
        )`
      ).run(event);
      return event;
    },
    findEventBySlug(slug: string): Event | undefined {
      const row = db.prepare("select * from events where slug = ?").get(slug) as EventRow | undefined;
      return row ? mapEvent(row) : undefined;
    },
    listEventRegistrations(eventId: string): EventRegistration[] {
      const rows = db.prepare("select * from event_registrations where event_id = ? order by created_at asc").all(eventId) as EventRegistrationRow[];
      return rows.map(mapEventRegistration);
    },
    countActiveEventRegistrations(eventId: string): number {
      const row = db.prepare(
        "select count(*) as count from event_registrations where event_id = ? and status in ('pending', 'confirmed')"
      ).get(eventId) as { count: number };
      return row.count;
    },
    createEventRegistration(event: Event, leadId: string): EventRegistration {
      if (!canAcceptRegistration({ capacity: event.capacity, activeRegistrationCount: this.countActiveEventRegistrations(event.id) })) {
        throw new Error("This event is full.");
      }
      const registration = createEventRegistration({ eventId: event.id, leadId, approvalMode: event.approvalMode });
      db.prepare(
        `insert into event_registrations (id, event_id, lead_id, status, created_at)
         values (@id, @eventId, @leadId, @status, @createdAt)`
      ).run(registration);
      return registration;
    },
    updateEventRegistrationStatus(id: string, status: "confirmed" | "declined"): EventRegistration {
      db.prepare("update event_registrations set status = ? where id = ?").run(status, id);
      const row = db.prepare("select * from event_registrations where id = ?").get(id) as EventRegistrationRow | undefined;
      if (!row) {
        throw new Error("Event registration not found.");
      }
      return mapEventRegistration(row);
    },
    getEventRegistrationDetail(id: string): { registration: EventRegistration; event: Event; lead: StoredLead } | undefined {
      const registrationRow = db.prepare("select * from event_registrations where id = ?").get(id) as EventRegistrationRow | undefined;
      if (!registrationRow) return undefined;
      const registration = mapEventRegistration(registrationRow);
      const eventRow = db.prepare("select * from events where id = ?").get(registration.eventId) as EventRow;
      const leadRow = db.prepare("select * from leads where id = ?").get(registration.leadId) as LeadRow;
      return { registration, event: mapEvent(eventRow), lead: mapLead(leadRow) };
    },
    getAvailability(providerId?: string): ParsedAvailability {
      const selectedProviderId = providerId ?? this.getDefaultProvider().id;
      const row = db.prepare("select * from availability where provider_id = ? order by updated_at desc limit 1").get(selectedProviderId) as
        | { original_text: string; timezone: string; rules_json: string }
        | undefined;

      if (!row) {
        return {
          originalText: "Monday to Friday 14:00-17:00",
          timezone: "Europe/Paris",
          rules: [
            { weekday: 1, start: "14:00", end: "17:00" },
            { weekday: 2, start: "14:00", end: "17:00" },
            { weekday: 3, start: "14:00", end: "17:00" },
            { weekday: 4, start: "14:00", end: "17:00" },
            { weekday: 5, start: "14:00", end: "17:00" }
          ]
        };
      }

      return {
        originalText: row.original_text,
        timezone: row.timezone,
        rules: JSON.parse(row.rules_json) as AvailabilityRule[]
      };
    },
    saveAvailability(availability: ParsedAvailability, providerId?: string): void {
      const selectedProviderId = providerId ?? this.getDefaultProvider().id;
      db.prepare(
        "insert into availability (id, provider_id, original_text, timezone, rules_json, updated_at) values (?, ?, ?, ?, ?, ?)"
      ).run(randomUUID(), selectedProviderId, availability.originalText, availability.timezone, JSON.stringify(availability.rules), now());
    },
    createLead(input: NormalizedLead, providerId?: string): StoredLead {
      const selectedProviderId = providerId ?? this.getDefaultProvider().id;
      const lead: StoredLead = {
        id: `lead-${randomUUID()}`,
        providerId: selectedProviderId,
        ...input,
        createdAt: now(),
        exportStatus: "pending"
      };
      db.prepare(
        `insert into leads (id, provider_id, telegram_user_id, name, contact, topic, source, export_status, created_at)
         values (@id, @providerId, @telegramUserId, @name, @contact, @topic, @source, @exportStatus, @createdAt)`
      ).run({ ...lead, telegramUserId: lead.telegramUserId ?? null });
      return lead;
    },
    listLeads(providerId?: string): StoredLead[] {
      const rows = providerId
        ? (db.prepare("select * from leads where provider_id = ? order by created_at desc").all(providerId) as LeadRow[])
        : (db.prepare("select * from leads order by created_at desc").all() as LeadRow[]);
      return rows.map(mapLead);
    },
    markLeadExported(id: string): void {
      db.prepare("update leads set export_status = 'exported' where id = ?").run(id);
    },
    findLeadById(id: string): StoredLead | undefined {
      const row = db.prepare("select * from leads where id = ?").get(id) as LeadRow | undefined;
      return row ? mapLead(row) : undefined;
    },
    createBooking(booking: Booking, providerId?: string): Booking {
      const selectedProviderId = providerId ?? this.getDefaultProvider().id;
      db.prepare(
        `insert into bookings (id, provider_id, lead_id, start_at, end_at, status, created_at)
         values (@id, @providerId, @leadId, @start, @end, @status, @createdAt)`
      ).run({ ...booking, providerId: selectedProviderId });
      return booking;
    },
    createPaymentIntent(input: { bookingId: string; providerId: string; amountMinor: number; currency: string; platformFeeBps: number }): PaymentIntent {
      const intent = createPaymentIntent(input);
      db.prepare(
        `insert into payment_intents (
          id, booking_id, provider_id, amount_minor, currency, status,
          provider_name, platform_fee_bps, created_at
        ) values (
          @id, @bookingId, @providerId, @amountMinor, @currency, @status,
          @providerName, @platformFeeBps, @createdAt
        )`
      ).run(intent);
      return intent;
    },
    findPaymentIntent(id: string): PaymentIntent | undefined {
      const row = db.prepare("select * from payment_intents where id = ?").get(id) as PaymentIntentRow | undefined;
      return row ? mapPaymentIntent(row) : undefined;
    },
    confirmPaymentIntent(id: string): { paymentIntent: PaymentIntent; booking: Booking; ledgerEntries: Required<LedgerEntry>[] } {
      const existing = this.findPaymentIntent(id);
      if (!existing) {
        throw new Error("Payment intent not found.");
      }
      db.prepare("update payment_intents set status = 'succeeded' where id = ?").run(id);
      const booking = this.updateBookingStatus(existing.bookingId, "confirmed");
      const entries = buildLedgerEntries({
        paymentIntentId: existing.id,
        providerId: existing.providerId,
        amountMinor: existing.amountMinor,
        platformFeeBps: existing.platformFeeBps
      }).map((entry) => ({
        id: `ledger-${randomUUID()}`,
        createdAt: now(),
        ...entry
      }));
      const insert = db.prepare(
        `insert into ledger_entries (id, payment_intent_id, provider_id, type, amount_minor, created_at)
         values (@id, @paymentIntentId, @providerId, @type, @amountMinor, @createdAt)`
      );
      for (const entry of entries) {
        insert.run(entry);
      }
      return { paymentIntent: this.findPaymentIntent(id) as PaymentIntent, booking, ledgerEntries: entries };
    },
    listLedgerEntries(paymentIntentId: string): Required<LedgerEntry>[] {
      const rows = db.prepare("select * from ledger_entries where payment_intent_id = ? order by created_at asc").all(paymentIntentId) as LedgerEntryRow[];
      return rows.map(mapLedgerEntry);
    },
    listBookings(providerId?: string): Booking[] {
      const rows = providerId
        ? (db.prepare("select * from bookings where provider_id = ? order by start_at asc").all(providerId) as BookingRow[])
        : (db.prepare("select * from bookings order by start_at asc").all() as BookingRow[]);
      return rows.map(mapBooking);
    },
    listScheduleBookingsForDate(providerId: string, localDate: string, timezone = "Europe/Paris"): ScheduleBooking[] {
      const rows = db.prepare(
        `select bookings.*, leads.name as client_name, leads.topic as lead_topic, leads.contact as lead_contact
         from bookings
         join leads on leads.id = bookings.lead_id
         where bookings.provider_id = ?
         order by bookings.start_at asc`
      ).all(providerId) as ScheduleBookingRow[];

      return rows
        .filter((row) => row.status === "confirmed" || row.status === "pending")
        .filter((row) => isSameLocalDate(row.start_at, localDate, timezone))
        .map((row) => ({
          clientName: row.client_name,
          topic: row.lead_topic,
          contact: row.lead_contact,
          status: row.status,
          start: row.start_at,
          end: row.end_at
        }));
    },
    updateBookingStatus(id: string, status: "confirmed" | "declined"): Booking {
      db.prepare("update bookings set status = ? where id = ?").run(status, id);
      const row = db.prepare("select * from bookings where id = ?").get(id) as BookingRow | undefined;
      if (!row) {
        throw new Error("Booking not found.");
      }
      return mapBooking(row);
    }
  };
}

function migrate(db: Database.Database): void {
  db.exec(`
    create table if not exists availability (
      id text primary key,
      provider_id text not null default 'provider-default',
      original_text text not null,
      timezone text not null,
      rules_json text not null,
      updated_at text not null
    );

    create table if not exists providers (
      id text primary key,
      telegram_user_id text not null,
      slug text not null unique,
      display_name text not null,
      service_name text not null,
      bio text not null,
      photo_ref text,
      session_duration_minutes integer not null,
      confirmation_mode text not null,
      plan text not null default 'free',
      billing_status text not null default 'trial',
      usage_notifications_consent integer not null default 1,
      marketing_consent integer not null default 0,
      payment_mode text not null default 'none',
      price_minor integer not null default 0,
      currency text not null default 'EUR',
      platform_fee_bps integer not null default 0,
      created_at text not null
    );

    create table if not exists leads (
      id text primary key,
      provider_id text not null default 'provider-default',
      telegram_user_id text,
      name text not null,
      contact text not null,
      topic text not null,
      source text not null,
      export_status text not null,
      created_at text not null
    );

    create table if not exists bookings (
      id text primary key,
      provider_id text not null default 'provider-default',
      lead_id text not null,
      start_at text not null,
      end_at text not null,
      status text not null,
      created_at text not null,
      foreign key (lead_id) references leads(id)
    );

    create table if not exists auto_approvals (
      provider_id text not null,
      contact text not null,
      created_at text not null,
      primary key (provider_id, contact)
    );

    create table if not exists time_offs (
      id text primary key,
      provider_id text not null,
      reason text not null,
      start_at text not null,
      end_at text not null,
      created_at text not null
    );

    create table if not exists payment_intents (
      id text primary key,
      booking_id text not null,
      provider_id text not null,
      amount_minor integer not null,
      currency text not null,
      status text not null,
      provider_name text not null,
      platform_fee_bps integer not null default 0,
      created_at text not null
    );

    create table if not exists ledger_entries (
      id text primary key,
      payment_intent_id text not null,
      provider_id text not null,
      type text not null,
      amount_minor integer not null,
      created_at text not null
    );

    create table if not exists events (
      id text primary key,
      provider_id text not null,
      slug text not null unique,
      title text not null,
      description text not null,
      start_at text not null,
      end_at text not null,
      capacity integer not null,
      approval_mode text not null,
      payment_mode text not null default 'none',
      price_minor integer not null default 0,
      currency text not null default 'EUR',
      created_at text not null
    );

    create table if not exists event_registrations (
      id text primary key,
      event_id text not null,
      lead_id text not null,
      status text not null,
      created_at text not null
    );
  `);
  ensureColumn(db, "availability", "provider_id", "text not null default 'provider-default'");
  ensureColumn(db, "leads", "provider_id", "text not null default 'provider-default'");
  ensureColumn(db, "bookings", "provider_id", "text not null default 'provider-default'");
  ensureColumn(db, "providers", "plan", "text not null default 'free'");
  ensureColumn(db, "providers", "billing_status", "text not null default 'trial'");
  ensureColumn(db, "providers", "usage_notifications_consent", "integer not null default 1");
  ensureColumn(db, "providers", "marketing_consent", "integer not null default 0");
  ensureColumn(db, "providers", "payment_mode", "text not null default 'none'");
  ensureColumn(db, "providers", "price_minor", "integer not null default 0");
  ensureColumn(db, "providers", "currency", "text not null default 'EUR'");
  ensureColumn(db, "providers", "platform_fee_bps", "integer not null default 0");
}

function ensureColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const columns = db.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function ensureDefaultProvider(db: Database.Database): void {
  const exists = db.prepare("select id from providers where slug = 'default'").get();
  if (exists) return;
  db.prepare(
    `insert into providers (
      id, telegram_user_id, slug, display_name, service_name, bio, photo_ref,
      session_duration_minutes, confirmation_mode, created_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "provider-default",
    "local-admin",
    "default",
    "Slotly AI",
    "AI consultation",
    "Personal AI consultation booking",
    null,
    60,
    "manual",
    now()
  );
}

type ProviderRow = {
  id: string;
  telegram_user_id: string;
  slug: string;
  display_name: string;
  service_name: string;
  bio: string;
  photo_ref: string | null;
  session_duration_minutes: number;
  confirmation_mode: ConfirmationMode;
  plan: ProviderPlan;
  billing_status: ProviderBillingStatus;
  usage_notifications_consent: number;
  marketing_consent: number;
  payment_mode: PaymentMode;
  price_minor: number;
  currency: string;
  platform_fee_bps: number;
  created_at: string;
};

type LeadRow = {
  id: string;
  provider_id: string;
  telegram_user_id: string | null;
  name: string;
  contact: string;
  topic: string;
  source: string;
  export_status: "pending" | "exported";
  created_at: string;
};

type BookingRow = {
  id: string;
  provider_id: string;
  lead_id: string;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  created_at: string;
};

type ScheduleBookingRow = BookingRow & {
  client_name: string;
  lead_topic: string;
  lead_contact: string;
};

type TimeOffRow = {
  id: string;
  provider_id: string;
  reason: string;
  start_at: string;
  end_at: string;
  created_at: string;
};

type PaymentIntentRow = {
  id: string;
  booking_id: string;
  provider_id: string;
  amount_minor: number;
  currency: string;
  status: PaymentIntent["status"];
  provider_name: "mock";
  platform_fee_bps: number;
  created_at: string;
};

type LedgerEntryRow = {
  id: string;
  payment_intent_id: string;
  provider_id: string;
  type: LedgerEntry["type"];
  amount_minor: number;
  created_at: string;
};

type EventRow = {
  id: string;
  provider_id: string;
  slug: string;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  capacity: number;
  approval_mode: ConfirmationMode;
  payment_mode: PaymentMode;
  price_minor: number;
  currency: string;
  created_at: string;
};

type EventRegistrationRow = {
  id: string;
  event_id: string;
  lead_id: string;
  status: EventRegistrationStatus;
  created_at: string;
};

function mapProvider(row: ProviderRow): StoredProvider {
  return {
    id: row.id,
    telegramUserId: row.telegram_user_id,
    slug: row.slug,
    displayName: row.display_name,
    serviceName: row.service_name,
    bio: row.bio,
    photoRef: row.photo_ref ?? undefined,
    sessionDurationMinutes: row.session_duration_minutes,
    confirmationMode: row.confirmation_mode,
    plan: row.plan,
    billingStatus: row.billing_status,
    usageNotificationsConsent: Boolean(row.usage_notifications_consent),
    marketingConsent: Boolean(row.marketing_consent),
    paymentMode: row.payment_mode,
    priceMinor: row.price_minor,
    currency: row.currency,
    platformFeeBps: row.platform_fee_bps,
    availabilityText: "",
    createdAt: row.created_at
  };
}

function mapLead(row: LeadRow): StoredLead {
  return {
    id: row.id,
    providerId: row.provider_id,
    telegramUserId: row.telegram_user_id ?? undefined,
    name: row.name,
    contact: row.contact,
    topic: row.topic,
    source: row.source,
    exportStatus: row.export_status,
    createdAt: row.created_at
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    leadId: row.lead_id,
    start: row.start_at,
    end: row.end_at,
    status: row.status,
    createdAt: row.created_at
  };
}

function mapTimeOff(row: TimeOffRow): Required<TimeOffBlock> {
  return {
    id: row.id,
    providerId: row.provider_id,
    reason: row.reason,
    start: row.start_at,
    end: row.end_at,
    createdAt: row.created_at
  };
}

function mapPaymentIntent(row: PaymentIntentRow): PaymentIntent {
  return {
    id: row.id,
    bookingId: row.booking_id,
    providerId: row.provider_id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    status: row.status,
    providerName: row.provider_name,
    platformFeeBps: row.platform_fee_bps,
    createdAt: row.created_at
  };
}

function mapLedgerEntry(row: LedgerEntryRow): Required<LedgerEntry> {
  return {
    id: row.id,
    paymentIntentId: row.payment_intent_id,
    providerId: row.provider_id,
    type: row.type,
    amountMinor: row.amount_minor,
    createdAt: row.created_at
  };
}

function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    providerId: row.provider_id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    start: row.start_at,
    end: row.end_at,
    capacity: row.capacity,
    approvalMode: row.approval_mode,
    paymentMode: row.payment_mode,
    priceMinor: row.price_minor,
    currency: row.currency,
    createdAt: row.created_at
  };
}

function mapEventRegistration(row: EventRegistrationRow): EventRegistration {
  return {
    id: row.id,
    eventId: row.event_id,
    leadId: row.lead_id,
    status: row.status,
    createdAt: row.created_at
  };
}

function now(): string {
  return new Date().toISOString();
}
