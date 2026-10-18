import { describe, expect, it } from "vitest";
import {
  balanceTone,
  formatBalance,
  formatDuration,
  formatLongDate,
  spokenBalance,
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
