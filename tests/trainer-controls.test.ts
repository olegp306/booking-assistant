import { describe, expect, it } from "vitest";
import { isSameLocalDate, normalizeAutoApprovalContact } from "../src/domain/trainer-controls.js";

describe("trainer controls", () => {
  it("normalizes auto-approve contacts", () => {
    expect(normalizeAutoApprovalContact("  CLIENT@Example.COM ")).toBe("client@example.com");
    expect(normalizeAutoApprovalContact("+33 6 11 22 33 44")).toBe("+33611223344");
  });

  it("matches bookings for today in provider timezone", () => {
    expect(isSameLocalDate("2026-05-25T12:00:00.000Z", "2026-05-25", "Europe/Paris")).toBe(true);
    expect(isSameLocalDate("2026-05-24T21:30:00.000Z", "2026-05-25", "Europe/Paris")).toBe(false);
  });
});
