export type LeadInput = {
  name?: string;
  contact?: string;
  topic?: string;
  source?: string;
  telegramUserId?: string;
};

export type NormalizedLead = {
  name: string;
  contact: string;
  topic: string;
  source: string;
  telegramUserId?: string;
};

export function normalizeLeadInput(input: LeadInput): NormalizedLead {
  const name = clean(input.name);
  const contact = clean(input.contact);
  const topic = clean(input.topic);

  if (!name || !contact || !topic) {
    throw new Error("Name, contact, and topic are required.");
  }

  return {
    name,
    contact,
    topic,
    source: clean(input.source) || "direct",
    ...(input.telegramUserId ? { telegramUserId: input.telegramUserId } : {})
  };
}

function clean(value?: string): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}
