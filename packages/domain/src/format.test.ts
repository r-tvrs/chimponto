import { describe, expect, it } from "vitest";
import {
  balanceTone,
  formatBalance,
  formatDayMonth,
  formatDuration,
  formatLongDate,
  formatMonth,
  formatPunchCount,
  formatShortDuration,
  parseDuration,
  spokenBalance,
  formatWeekday,
} from "./format";

describe("formatDuration", () => {
  it.each([
    [266, "4h26"],
    [0, "0h00"],
    [60, "1h00"],
    [-35, "0h35"],
  ])("%i min -> %s", (min, expected) => {
    expect(formatDuration(min)).toBe(expected);
  });
});

describe("formatShortDuration", () => {
  it.each([
    [53, "53 min"],
    [60, "1h"],
    [480, "8h"],
    [65, "1h05"],
    [-7, "7 min"],
  ])("%i min -> %s", (min, expected) => {
    expect(formatShortDuration(min)).toBe(expected);
  });
});

describe("parseDuration", () => {
  it.each([
    ["8h00", 480],
    ["8h48", 528],
    ["10h30", 630],
    ["08h00", 480],
    ["8H00", 480],
    ["8:30", 510],
    ["8h", 480],
    ["8", 480],
    [" 8h00 ", 480],
  ])("%s -> %i min", (text, expected) => {
    expect(parseDuration(text)).toBe(expected);
  });

  it.each(["", "h00", "8h5", "8h60", "8h000", "-8h00", "8,5", "oito horas"])(
    "rejects %j",
    (text) => {
      expect(parseDuration(text)).toBeNull();
    },
  );
});

describe("formatBalance", () => {
  it("prefixes positive balances with +", () => {
    expect(formatBalance(80)).toBe("+1h20");
  });

  it("prefixes negative balances with the minus sign U+2212", () => {
    expect(formatBalance(-35)).toBe("−0h35");
  });

  it("prefixes zero with ±", () => {
    expect(formatBalance(0)).toBe("±0h00");
  });
});

describe("balanceTone", () => {
  it.each([
    [1, "positive"],
    [-1, "negative"],
    [0, "neutral"],
  ] as const)("%i -> %s", (min, tone) => {
    expect(balanceTone(min)).toBe(tone);
  });
});

describe("spokenBalance", () => {
  it.each([
    [80, "mais 1 hora e 20 minutos"],
    [-61, "menos 1 hora e 1 minuto"],
    [0, "0 horas e 0 minutos"],
    [120, "mais 2 horas e 0 minutos"],
  ])("%i -> %s", (min, expected) => {
    expect(spokenBalance(min)).toBe(expected);
  });
});

describe("formatPunchCount", () => {
  it.each([
    [1, "1 batida"],
    [3, "3 batidas"],
    [5, "5 batidas"],
  ])("%i -> %s", (count, expected) => {
    expect(formatPunchCount(count)).toBe(expected);
  });
});

describe("formatLongDate", () => {
  it.each([
    ["2026-10-16T12:00:00Z", "sex, 16 de outubro"],
    ["2026-03-01T15:00:00Z", "dom, 1 de março"],
    ["2026-08-22T13:00:00Z", "sáb, 22 de agosto"],
    // 23:30 de sexta em São Paulo ainda é sexta, embora já seja sábado em UTC.
    ["2026-10-17T02:30:00Z", "sex, 16 de outubro"],
  ])("%s -> %s", (iso, expected) => {
    expect(formatLongDate(new Date(iso))).toBe(expected);
  });
});

describe("calendar dates", () => {
  it.each([
    ["2026-09-20", "20 set"],
    ["2026-10-19", "19 out"],
    ["2026-11-01", "1º nov"],
    ["2027-02-05", "5 fev"],
  ])("formatDayMonth(%s) = %s", (date, text) => {
    expect(formatDayMonth(date)).toBe(text);
  });

  it("names the month and the weekday of a date", () => {
    expect(formatMonth("2026-10-16")).toBe("outubro");
    expect(formatMonth("2026-03-01")).toBe("março");
    expect(formatWeekday("2026-10-16")).toBe("sex");
    expect(formatWeekday("2026-10-18")).toBe("dom");
  });
});
