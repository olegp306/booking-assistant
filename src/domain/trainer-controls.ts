export type ScheduleBooking = {
  clientName: string;
  topic: string;
  contact: string;
  status: string;
  start: string;
  end: string;
};

export function normalizeAutoApprovalContact(contact: string): string {
  const trimmed = contact.trim().toLowerCase();
  if (trimmed.includes("@")) {
    return trimmed;
  }

  return trimmed.replace(/[^\d+]/g, "");
}

export function isSameLocalDate(isoDate: string, localDate: string, timezone = "Europe/Paris"): boolean {
  return localDateKey(new Date(isoDate), timezone) === localDate;
}

export function localDateKey(date: Date, timezone = "Europe/Paris"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
