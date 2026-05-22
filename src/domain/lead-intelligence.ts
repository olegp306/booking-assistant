import type { LeadInput } from "./lead.js";

export type ContactKind = "email" | "phone" | "unknown";
export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadMissingField = "name" | "contact" | "topic";

export type LeadInsight = {
  contactKind: ContactKind;
  normalizedContact: string;
  missingFields: LeadMissingField[];
  temperature: LeadTemperature;
  crmNotes: string[];
};

export function analyzeLead(input: LeadInput): LeadInsight {
  const name = clean(input.name);
  const contact = clean(input.contact);
  const topic = clean(input.topic);
  const contactKind = classifyContact(contact);
  const normalizedContact = normalizeContact(contact, contactKind);
  const missingFields = detectMissingFields({ name, contact, topic });
  const temperature = classifyTemperature(topic);
  const crmNotes = [`contact:${contactKind}`];

  if (missingFields.length > 0) {
    crmNotes.push(`missing:${missingFields.join(",")}`);
  }
  crmNotes.push(`temperature:${temperature}`);

  return {
    contactKind,
    normalizedContact,
    missingFields,
    temperature,
    crmNotes
  };
}

function detectMissingFields(input: { name: string; contact: string; topic: string }): LeadMissingField[] {
  const missing: LeadMissingField[] = [];
  if (!input.name) missing.push("name");
  if (!input.contact) missing.push("contact");
  if (!input.topic) missing.push("topic");
  return missing;
}

function classifyContact(contact: string): ContactKind {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    return "email";
  }

  const digits = contact.replace(/\D/g, "");
  if (digits.length >= 7) {
    return "phone";
  }

  return "unknown";
}

function normalizeContact(contact: string, kind: ContactKind): string {
  if (kind === "email") {
    return contact.toLowerCase();
  }

  if (kind === "phone") {
    return contact.replace(/\D/g, "");
  }

  return contact;
}

function classifyTemperature(topic: string): LeadTemperature {
  const normalized = topic.toLowerCase();
  if (/(automation|автоматизац|crm|бот|интеграц|booking|запис)/i.test(normalized)) {
    return "hot";
  }

  if (/(ai|ии|консультац|разобрать|идея)/i.test(normalized)) {
    return "warm";
  }

  return "cold";
}

function clean(value?: string): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
