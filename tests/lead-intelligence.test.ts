import { describe, expect, it } from "vitest";
import { analyzeLead } from "../src/domain/lead-intelligence.js";

describe("lead intelligence", () => {
  it("extracts email contact and reports complete lead data", () => {
    expect(
      analyzeLead({
        name: "Ada",
        contact: "ADA@EXAMPLE.COM",
        topic: "Need AI automation for client intake"
      })
    ).toEqual({
      contactKind: "email",
      normalizedContact: "ada@example.com",
      missingFields: [],
      temperature: "hot",
      crmNotes: ["contact:email", "temperature:hot"]
    });
  });

  it("extracts phone contact and marks a broad topic as warm", () => {
    expect(
      analyzeLead({
        name: "Grace",
        contact: "+33 6 12 34 56 78",
        topic: "Хочу консультацию по AI"
      })
    ).toEqual({
      contactKind: "phone",
      normalizedContact: "33612345678",
      missingFields: [],
      temperature: "warm",
      crmNotes: ["contact:phone", "temperature:warm"]
    });
  });

  it("reports missing fields and unknown contact shape", () => {
    expect(analyzeLead({ name: "", contact: "telegram only", topic: "" })).toEqual({
      contactKind: "unknown",
      normalizedContact: "telegram only",
      missingFields: ["name", "topic"],
      temperature: "cold",
      crmNotes: ["contact:unknown", "missing:name,topic", "temperature:cold"]
    });
  });
});
