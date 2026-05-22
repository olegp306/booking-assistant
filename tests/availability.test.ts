import { describe, expect, it } from "vitest";
import { generateSlots, parseAvailabilityText } from "../src/domain/availability.js";

describe("availability", () => {
  it("parses a weekday availability window from free text", () => {
    const availability = parseAvailabilityText("Monday to Friday 14:00-17:00", "Europe/Paris");

    expect(availability.timezone).toBe("Europe/Paris");
    expect(availability.rules).toEqual([
      { weekday: 1, start: "14:00", end: "17:00" },
      { weekday: 2, start: "14:00", end: "17:00" },
      { weekday: 3, start: "14:00", end: "17:00" },
      { weekday: 4, start: "14:00", end: "17:00" },
      { weekday: 5, start: "14:00", end: "17:00" }
    ]);
  });

  it("generates one-hour slots and excludes booked starts", () => {
    const availability = parseAvailabilityText("Monday to Friday 14:00-17:00", "Europe/Paris");
    const slots = generateSlots({
      availability,
      from: new Date("2026-05-25T00:00:00.000Z"),
      days: 1,
      durationMinutes: 60,
      bookedStarts: ["2026-05-25T13:00:00.000Z"]
    });

    expect(slots).toEqual([
      {
        label: "Mon 25 May, 14:00",
        start: "2026-05-25T12:00:00.000Z",
        end: "2026-05-25T13:00:00.000Z"
      },
      {
        label: "Mon 25 May, 16:00",
        start: "2026-05-25T14:00:00.000Z",
        end: "2026-05-25T15:00:00.000Z"
      }
    ]);
  });

  it("does not generate slots before the requested start time", () => {
    const availability = parseAvailabilityText("Monday to Friday 14:00-17:00", "Europe/Paris");
    const slots = generateSlots({
      availability,
      from: new Date("2026-05-25T13:30:00.000Z"),
      days: 1,
      durationMinutes: 60
    });

    expect(slots).toEqual([
      {
        label: "Mon 25 May, 16:00",
        start: "2026-05-25T14:00:00.000Z",
        end: "2026-05-25T15:00:00.000Z"
      }
    ]);
  });

  it("excludes slots that overlap provider time-off blocks", () => {
    const availability = parseAvailabilityText("Monday to Friday 14:00-17:00", "Europe/Paris");
    const slots = generateSlots({
      availability,
      from: new Date("2026-06-01T00:00:00.000Z"),
      days: 2,
      durationMinutes: 60,
      blockedIntervals: [
        {
          start: "2026-06-01T00:00:00.000Z",
          end: "2026-06-02T00:00:00.000Z"
        }
      ]
    });

    expect(slots.map((slot) => slot.label)).toEqual(["Tue 02 Jun, 14:00", "Tue 02 Jun, 15:00", "Tue 02 Jun, 16:00"]);
  });
});
