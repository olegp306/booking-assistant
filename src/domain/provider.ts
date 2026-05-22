import { normalizePaymentSettings, type PaymentMode } from "./payment.js";

export type ConfirmationMode = "manual" | "auto";
export type ProviderPlan = "free" | "pro";
export type ProviderBillingStatus = "trial" | "active" | "past_due" | "cancelled";

export type ProviderProfileInput = {
  telegramUserId: string;
  displayName: string;
  serviceName: string;
  bio: string;
  photoRef?: string;
  sessionDurationMinutes?: number;
  confirmationMode?: ConfirmationMode;
  plan?: ProviderPlan;
  billingStatus?: ProviderBillingStatus;
  usageNotificationsConsent?: boolean;
  marketingConsent?: boolean;
  paymentMode?: PaymentMode;
  priceMinor?: number;
  currency?: string;
  platformFeeBps?: number;
  availabilityText: string;
};

export type ProviderProfile = {
  telegramUserId: string;
  slug: string;
  displayName: string;
  serviceName: string;
  bio: string;
  photoRef?: string;
  sessionDurationMinutes: number;
  confirmationMode: ConfirmationMode;
  plan: ProviderPlan;
  billingStatus: ProviderBillingStatus;
  usageNotificationsConsent: boolean;
  marketingConsent: boolean;
  paymentMode: PaymentMode;
  priceMinor: number;
  currency: string;
  platformFeeBps: number;
  availabilityText: string;
};

const transliteration: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ы: "y",
  э: "e",
  ю: "yu",
  я: "ya",
  ь: "",
  ъ: ""
};

export function createProviderProfile(input: ProviderProfileInput): ProviderProfile {
  const displayName = clean(input.displayName);
  const serviceName = clean(input.serviceName);
  const bio = clean(input.bio);
  const availabilityText = clean(input.availabilityText);
  const paymentSettings = normalizePaymentSettings({
    paymentMode: input.paymentMode,
    priceMinor: input.priceMinor,
    currency: input.currency,
    platformFeeBps: input.platformFeeBps
  });

  if (!input.telegramUserId || !displayName || !serviceName || !bio || !availabilityText) {
    throw new Error("Provider telegram id, name, service, bio, and availability are required.");
  }

  return {
    telegramUserId: input.telegramUserId,
    slug: makeProviderSlug(displayName),
    displayName,
    serviceName,
    bio,
    ...(input.photoRef ? { photoRef: input.photoRef.trim() } : {}),
    sessionDurationMinutes: input.sessionDurationMinutes ?? 60,
    confirmationMode: input.confirmationMode ?? "manual",
    plan: input.plan ?? "free",
    billingStatus: input.billingStatus ?? "trial",
    usageNotificationsConsent: input.usageNotificationsConsent ?? true,
    marketingConsent: input.marketingConsent ?? false,
    ...paymentSettings,
    availabilityText
  };
}

export function makeProviderSlug(value: string): string {
  const transliterated = value
    .trim()
    .toLowerCase()
    .split("")
    .map((char) => transliteration[char] ?? char)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
