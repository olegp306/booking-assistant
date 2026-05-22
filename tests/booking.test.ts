import { describe, expect, it } from "vitest";
import { createBooking } from "../src/domain/booking.js";

describe("booking", () => {
  it("creates a booking for an open slot", () => {
    const booking = createBooking({
      leadId: "lead-1",
      start: "2026-05-25T12:00:00.000Z",
      end: "2026-05-25T13:00:00.000Z",
      existingBookings: []
    });

    expect(booking).toMatchObject({
      leadId: "lead-1",
      start: "2026-05-25T12:00:00.000Z",
      end: "2026-05-25T13:00:00.000Z",
      status: "confirmed"
    });
    expect(booking.id).toMatch(/^booking-/);
  });

  it("creates pending bookings for manual confirmation mode", () => {
    const booking = createBooking({
      leadId: "lead-1",
      start: "2026-05-25T12:00:00.000Z",
      end: "2026-05-25T13:00:00.000Z",
      existingBookings: [],
      confirmationMode: "manual"
    });

    expect(booking.status).toBe("pending");
  });

  it("creates confirmed bookings for auto confirmation mode", () => {
    const booking = createBooking({
      leadId: "lead-1",
      start: "2026-05-25T12:00:00.000Z",
      end: "2026-05-25T13:00:00.000Z",
      existingBookings: [],
      confirmationMode: "auto"
    });

    expect(booking.status).toBe("confirmed");
  });

  it("rejects a booking when the slot is already taken", () => {
    expect(() =>
      createBooking({
        leadId: "lead-2",
        start: "2026-05-25T12:00:00.000Z",
        end: "2026-05-25T13:00:00.000Z",
        existingBookings: [
          {
            id: "booking-existing",
            leadId: "lead-1",
            start: "2026-05-25T12:00:00.000Z",
            end: "2026-05-25T13:00:00.000Z",
            status: "pending",
            createdAt: "2026-05-21T12:00:00.000Z"
          }
        ]
      })
    ).toThrow("This slot is already booked.");
  });
});
