import { describe, expect, it } from "vitest";
import { canAcceptRegistration, createEvent, createEventRegistration, makeEventSlug } from "../src/domain/event.js";

describe("event", () => {
  it("creates a URL-safe event with capacity and manual approval by default", () => {
    expect(
      createEvent({
        providerId: "provider-1",
        title: "Open Singing Class",
        description: "Group voice lesson",
        start: "2026-06-20T16:00:00.000Z",
        end: "2026-06-20T18:00:00.000Z",
        capacity: 8
      })
    ).toMatchObject({
      providerId: "provider-1",
      slug: "open-singing-class",
      title: "Open Singing Class",
      description: "Group voice lesson",
      capacity: 8,
      approvalMode: "manual",
      paymentMode: "none"
    });
  });

  it("creates stable event slugs", () => {
    expect(makeEventSlug("  Saturday Dance & Voice! ")).toBe("saturday-dance-voice");
  });

  it("requires a valid event capacity and time window", () => {
    expect(() =>
      createEvent({
        providerId: "provider-1",
        title: "Bad Event",
        description: "No seats",
        start: "2026-06-20T18:00:00.000Z",
        end: "2026-06-20T16:00:00.000Z",
        capacity: 0
      })
    ).toThrow("Event requires provider, title, description, valid time, and capacity.");
  });

  it("keeps manual event registrations pending", () => {
    expect(
      createEventRegistration({
        eventId: "event-1",
        leadId: "lead-1",
        approvalMode: "manual"
      })
    ).toMatchObject({
      eventId: "event-1",
      leadId: "lead-1",
      status: "pending"
    });
  });

  it("blocks registrations when confirmed and pending seats reach capacity", () => {
    expect(canAcceptRegistration({ capacity: 2, activeRegistrationCount: 1 })).toBe(true);
    expect(canAcceptRegistration({ capacity: 2, activeRegistrationCount: 2 })).toBe(false);
  });
});
