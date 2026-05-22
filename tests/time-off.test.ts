import { describe, expect, it } from "vitest";
import { parseTimeOffText } from "../src/domain/time-off.js";

describe("time off", () => {
  it("parses Russian vacation text with ISO dates", () => {
    expect(parseTimeOffText("у меня отпуск с 2026-06-01 по 2026-06-14")).toEqual({
      reason: "отпуск",
      start: "2026-06-01T00:00:00.000Z",
      end: "2026-06-15T00:00:00.000Z"
    });
  });

  it("parses English vacation text with ISO dates", () => {
    expect(parseTimeOffText("vacation 2026-06-01 to 2026-06-14")).toEqual({
      reason: "vacation",
      start: "2026-06-01T00:00:00.000Z",
      end: "2026-06-15T00:00:00.000Z"
    });
  });
});
