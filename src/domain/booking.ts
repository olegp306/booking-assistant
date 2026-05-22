import type { ConfirmationMode } from "./provider.js";
import { randomUUID } from "node:crypto";

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export type Booking = {
  id: string;
  leadId: string;
  start: string;
  end: string;
  status: BookingStatus;
  createdAt: string;
};

export function createBooking(input: {
  leadId: string;
  start: string;
  end: string;
  existingBookings: Booking[];
  confirmationMode?: ConfirmationMode;
}): Booking {
  const startMs = Date.parse(input.start);
  const endMs = Date.parse(input.end);

  if (!input.leadId || Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error("Lead and a valid slot are required.");
  }

  const hasConflict = input.existingBookings
    .filter((booking) => booking.status === "confirmed" || booking.status === "pending")
    .some((booking) => overlaps(startMs, endMs, Date.parse(booking.start), Date.parse(booking.end)));

  if (hasConflict) {
    throw new Error("This slot is already booked.");
  }

  return {
    id: `booking-${randomUUID()}`,
    leadId: input.leadId,
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    status: input.confirmationMode === "manual" ? "pending" : "confirmed",
    createdAt: new Date().toISOString()
  };
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}
