import { describe, expect, it } from "vitest";
import { companyRulesSchema } from "./company-rules";
import { nextPeriod, periodContaining, periodTiming, previousPeriod } from "./period";

const RULES = companyRulesSchema.parse({});

describe("periodContaining", () => {
  it("resolves the doc's example: 20/09/2026–19/10/2026, paid on 01/11/2026", () => {
    expect(periodContaining("2026-10-16", RULES)).toEqual({
      start: "2026-09-20",
      end: "2026-10-19",
      payDate: "2026-11-01",
    });
  });

  it.each([
    ["2026-10-19", "2026-09-20", "2026-10-19", "2026-11-01"],
    ["2026-10-20", "2026-10-20", "2026-11-19", "2026-12-01"],
    ["2026-12-25", "2026-12-20", "2027-01-19", "2027-02-01"],
    ["2027-01-05", "2026-12-20", "2027-01-19", "2027-02-01"],
    ["2026-11-30", "2026-11-20", "2026-12-19", "2027-01-01"],
  ])(
    "%s falls in %s–%s, paid on %s (closing day and year turnover)",
    (date, start, end, payDate) => {
      expect(periodContaining(date, RULES)).toEqual({ start, end, payDate });
    },
  );

  it("follows the company's closing day and payday", () => {
    // Fechamento no dia 28: o período de março começa em 1º/03, mesmo em ano não bissexto.
    expect(periodContaining("2027-03-10", { closingDay: 28, payday: 5 })).toEqual({
      start: "2027-03-01",
      end: "2027-03-28",
      payDate: "2027-04-05",
    });
  });
});

describe("previousPeriod and nextPeriod", () => {
  const current = periodContaining("2026-10-16", RULES);

  it("step one period back and forth", () => {
    expect(previousPeriod(current, RULES)).toEqual({
      start: "2026-08-20",
      end: "2026-09-19",
      payDate: "2026-10-01",
    });
    expect(nextPeriod(current, RULES)).toEqual({
      start: "2026-10-20",
      end: "2026-11-19",
      payDate: "2026-12-01",
    });
  });

  it("cross the year", () => {
    const january = periodContaining("2027-01-05", RULES);
    expect(previousPeriod(january, RULES).end).toBe("2026-12-19");
    expect(nextPeriod(previousPeriod(january, RULES), RULES)).toEqual(january);
  });
});

describe("periodTiming", () => {
  const period = periodContaining("2026-10-16", RULES);

  it.each([
    ["2026-09-20", 29],
    ["2026-10-16", 3],
    ["2026-10-19", 0],
  ])("is current on %s, closing in %i days", (today, daysUntilClose) => {
    expect(periodTiming(period, today)).toEqual({ kind: "current", daysUntilClose });
  });

  it("is past after the closing day and future before the start", () => {
    expect(periodTiming(period, "2026-10-20")).toEqual({ kind: "past" });
    expect(periodTiming(period, "2026-09-19")).toEqual({ kind: "future" });
  });
});
