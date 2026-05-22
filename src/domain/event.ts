import { randomUUID } from "node:crypto";
import type { ConfirmationMode } from "./provider.js";
import { normalizePaymentSettings, type PaymentMode } from "./payment.js";

export type EventRegistrationStatus = "pending" | "confirmed" | "declined" | "waitlisted" | "cancelled";

export type EventInput = {
  providerId: string;
  title: string;
  description: string;
  start: string;
  end: string;
  capacity: number;
  approvalMode?: ConfirmationMode;
  paymentMode?: PaymentMode;
  priceMinor?: number;
  currency?: string;
};

export type Event = {
  id: string;
  providerId: string;
  slug: string;
  title: string;
  description: string;
  start: string;
  end: string;
  capacity: number;
  approvalMode: ConfirmationMode;
  paymentMode: PaymentMode;
  priceMinor: number;
  currency: string;
  createdAt: string;
};

export type EventRegistration = {
  id: string;
  eventId: string;
  leadId: string;
  status: EventRegistrationStatus;
  createdAt: string;
};

export function createEvent(input: EventInput): Event {
  const title = clean(input.title);
  const description = clean(input.description);
  const startMs = Date.parse(input.start);
  const endMs = Date.parse(input.end);
  const payment = normalizePaymentSettings({
    paymentMode: input.paymentMode,
    priceMinor: input.priceMinor,
    currency: input.currency
  });

  if (!input.providerId || !title || !description || Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs || input.capacity < 1) {
    throw new Error("Event requires provider, title, description, valid time, and capacity.");
  }

  return {
    id: `event-${randomUUID()}`,
    providerId: input.providerId,
    slug: makeEventSlug(title),
    title,
    description,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    capacity: input.capacity,
    approvalMode: input.approvalMode ?? "manual",
    paymentMode: payment.paymentMode,
    priceMinor: payment.priceMinor,
    currency: payment.currency,
    createdAt: new Date().toISOString()
  };
}

export function createEventRegistration(input: {
  eventId: string;
  leadId: string;
  approvalMode: ConfirmationMode;
}): EventRegistration {
  if (!input.eventId || !input.leadId) {
    throw new Error("Event and participant are required.");
  }

  return {
    id: `event-reg-${randomUUID()}`,
    eventId: input.eventId,
    leadId: input.leadId,
    status: input.approvalMode === "auto" ? "confirmed" : "pending",
    createdAt: new Date().toISOString()
  };
}

export function canAcceptRegistration(input: { capacity: number; activeRegistrationCount: number }): boolean {
  return input.activeRegistrationCount < input.capacity;
}

export function makeEventSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
