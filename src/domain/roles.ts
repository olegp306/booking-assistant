export type TelegramRole = "super_admin" | "specialist_admin" | "client";

export type ResolvedTelegramRole = {
  role: TelegramRole;
  providerId?: string;
  providerSlug?: string;
};

export function parseSuperAdminIds(value = ""): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveTelegramRole(input: {
  telegramUserId: string;
  superAdminTelegramIds?: string[];
  ownedProvider?: { id: string; slug: string };
}): ResolvedTelegramRole {
  const providerFields = input.ownedProvider
    ? { providerId: input.ownedProvider.id, providerSlug: input.ownedProvider.slug }
    : {};

  if ((input.superAdminTelegramIds ?? []).includes(input.telegramUserId)) {
    return { role: "super_admin", ...providerFields };
  }

  if (input.ownedProvider) {
    return { role: "specialist_admin", ...providerFields };
  }

  return { role: "client" };
}
