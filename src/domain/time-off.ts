export type TimeOffBlock = {
  id?: string;
  providerId?: string;
  reason: string;
  start: string;
  end: string;
  createdAt?: string;
};

export function parseTimeOffText(text: string): Omit<TimeOffBlock, "id" | "providerId" | "createdAt"> {
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/(отпуск|vacation|busy|не работаю).*?(\d{4}-\d{2}-\d{2}).*?(?:по|to|-)\s*(\d{4}-\d{2}-\d{2})/i);

  if (!match) {
    throw new Error("Use a range like 'vacation 2026-06-01 to 2026-06-14'.");
  }

  return {
    reason: match[1],
    start: startOfUtcDate(match[2]),
    end: dayAfterUtcDate(match[3])
  };
}

export function overlapsInterval(
  candidate: { start: string; end: string },
  blocked: { start: string; end: string }
): boolean {
  return Date.parse(candidate.start) < Date.parse(blocked.end) && Date.parse(blocked.start) < Date.parse(candidate.end);
}

function startOfUtcDate(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function dayAfterUtcDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}
