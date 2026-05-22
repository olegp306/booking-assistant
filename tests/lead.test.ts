import { describe, expect, it } from "vitest";
import { normalizeLeadInput } from "../src/domain/lead.js";

describe("lead", () => {
  it("normalizes a complete lead input", () => {
    expect(
      normalizeLeadInput({
        name: "  Oleg  ",
        contact: "  oleg@example.com ",
        topic: "  I want to understand AI automation ",
        source: "telegram"
      })
    ).toEqual({
      name: "Oleg",
      contact: "oleg@example.com",
      topic: "I want to understand AI automation",
      source: "telegram"
    });
  });

  it("requires name, contact, and topic", () => {
    expect(() => normalizeLeadInput({ name: "", contact: "", topic: "" })).toThrow(
      "Name, contact, and topic are required."
    );
  });
});
