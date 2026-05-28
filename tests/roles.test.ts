import { describe, expect, it } from "vitest";
import { parseSuperAdminIds, resolveTelegramRole } from "../src/domain/roles.js";

describe("roles", () => {
  it("parses comma separated super admin Telegram ids", () => {
    expect(parseSuperAdminIds(" 1,2, ,3 ")).toEqual(["1", "2", "3"]);
  });

  it("resolves super admins before specialist ownership", () => {
    expect(
      resolveTelegramRole({
        telegramUserId: "42",
        superAdminTelegramIds: ["42"],
        ownedProvider: { id: "provider-1", slug: "nastya" }
      })
    ).toEqual({ role: "super_admin", providerId: "provider-1", providerSlug: "nastya" });
  });

  it("resolves provider owners and client-only users", () => {
    expect(
      resolveTelegramRole({
        telegramUserId: "100",
        superAdminTelegramIds: ["42"],
        ownedProvider: { id: "provider-2", slug: "coach" }
      })
    ).toEqual({ role: "specialist_admin", providerId: "provider-2", providerSlug: "coach" });

    expect(resolveTelegramRole({ telegramUserId: "200", superAdminTelegramIds: ["42"] })).toEqual({
      role: "client"
    });
  });
});
