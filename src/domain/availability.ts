export type AvailabilityRule = {
  weekday: number;
  start: string;
  end: string;
};

export type ParsedAvailability = {
  originalText: string;
  timezone: string;
  rules: AvailabilityRule[];
};

export type Slot = {
  label: string;
  start: string;
  end: string;
};

export type BlockedInterval = {
  start: string;
  end: string;
};

const dayNames = new Map<string, number>([
  ["sunday", 0],
  ["sun", 0],
  ["monday", 1],
  ["mon", 1],
  ["tuesday", 2],
  ["tue", 2],
  ["wednesday", 3],
  ["wed", 3],
  ["thursday", 4],
  ["thu", 4],
  ["friday", 5],
  ["fri", 5],
  ["saturday", 6],
  ["sat", 6]
]);

export function parseAvailabilityText(text: string, timezone = "Europe/Paris"): ParsedAvailability {
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(
    /(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\s+(?:to|-)\s+(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/
  );

  if (!match) {
    throw new Error("Use a range like 'Monday to Friday 14:00-17:00'.");
  }

  const startDay = dayNames.get(match[1]);
  const endDay = dayNames.get(match[2]);
  if (startDay === undefined || endDay === undefined) {
    throw new Error("Unsupported weekday in availability text.");
  }

  const rules: AvailabilityRule[] = [];
  for (let weekday = startDay; weekday <= endDay; weekday += 1) {
    rules.push({ weekday, start: normalizeTime(match[3]), end: normalizeTime(match[4]) });
  }

  return { originalText: text, timezone, rules };
}

export function generateSlots(input: {
  availability: ParsedAvailability;
  from: Date;
  days: number;
  durationMinutes: number;
  bookedStarts?: string[];
  blockedIntervals?: BlockedInterval[];
}): Slot[] {
  const booked = new Set(input.bookedStarts ?? []);
  const blockedIntervals = input.blockedIntervals ?? [];
  const slots: Slot[] = [];
  const cursor = startOfUtcDay(input.from);

  for (let offset = 0; offset < input.days; offset += 1) {
    const day = new Date(cursor.getTime() + offset * 86_400_000);
    const weekday = day.getUTCDay();
    const rules = input.availability.rules.filter((rule) => rule.weekday === weekday);

    for (const rule of rules) {
      let slotStart = zonedTimeToUtc(day, rule.start, input.availability.timezone);
      const windowEnd = zonedTimeToUtc(day, rule.end, input.availability.timezone);

      while (slotStart.getTime() + input.durationMinutes * 60_000 <= windowEnd.getTime()) {
        const start = slotStart.toISOString();
        const end = new Date(slotStart.getTime() + input.durationMinutes * 60_000).toISOString();
        if (slotStart >= input.from && !booked.has(start) && !isBlocked({ start, end }, blockedIntervals)) {
          slots.push({
            label: formatSlotLabel(slotStart, input.availability.timezone),
            start,
            end
          });
        }
        slotStart = new Date(slotStart.getTime() + input.durationMinutes * 60_000);
      }
    }
  }

  return slots;
}

function isBlocked(slot: BlockedInterval, blockedIntervals: BlockedInterval[]): boolean {
  return blockedIntervals.some((blocked) => Date.parse(slot.start) < Date.parse(blocked.end) && Date.parse(blocked.start) < Date.parse(slot.end));
}

function normalizeTime(value: string): string {
  const [hour, minute] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function zonedTimeToUtc(day: Date, time: string, timezone: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(utcGuess);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  const offset = asUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset);
}

function formatSlotLabel(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(/(\w{3} \d{2} \w{3}) (\d{2}:\d{2})/, "$1, $2");
}
