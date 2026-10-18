import { describe, expect, it } from "vitest";
import { fromLocal, toLocalDate, toLocalTime, truncateToMinute } from "./local-time";

describe("toLocalDate", () => {
  it.each([
    // São Paulo é UTC−3: 02:59Z ainda é o dia anterior; 03:00Z já é meia-noite do dia seguinte.
    ["2026-10-17T02:59:00Z", "2026-10-16"],
    ["2026-10-17T03:00:00Z", "2026-10-17"],
    ["2026-10-16T12:00:00Z", "2026-10-16"],
    ["2026-01-01T02:30:00Z", "2025-12-31"],
  ])("%s -> %s", (instant, expected) => {
    expect(toLocalDate(new Date(instant))).toBe(expected);
  });
});

describe("toLocalTime", () => {
  it.each([
    ["2026-10-16T12:02:00Z", "09:02"],
    ["2026-10-17T02:59:59Z", "23:59"],
    ["2026-10-17T03:00:00Z", "00:00"],
  ])("%s -> %s", (instant, expected) => {
    expect(toLocalTime(new Date(instant))).toBe(expected);
  });
});

describe("fromLocal", () => {
  it.each([
    ["2026-10-16", "09:02", "2026-10-16T12:02:00.000Z"],
    ["2026-10-16", "23:59", "2026-10-17T02:59:00.000Z"],
    ["2026-10-17", "00:00", "2026-10-17T03:00:00.000Z"],
    ["2025-12-31", "23:30", "2026-01-01T02:30:00.000Z"],
  ])("%s %s em São Paulo -> %s", (date, time, expected) => {
    expect(fromLocal(date, time)?.toISOString()).toBe(expected);
  });

  it("round-trips with toLocalDate and toLocalTime", () => {
    const instant = fromLocal("2026-02-28", "13:28")!;
    expect([toLocalDate(instant), toLocalTime(instant)]).toEqual(["2026-02-28", "13:28"]);
  });

  it.each([
    ["", "09:02"],
    ["2026-10-16", ""],
    ["2026-02-30", "09:02"],
    ["2026-10-16", "24:00"],
    ["16/10/2026", "09:02"],
  ])("rejects %j %j", (date, time) => {
    expect(fromLocal(date, time)).toBeNull();
  });
});

describe("truncateToMinute", () => {
  it("drops seconds and milliseconds", () => {
    expect(truncateToMinute(new Date("2026-10-16T12:02:59.999Z")).toISOString()).toBe(
      "2026-10-16T12:02:00.000Z",
    );
  });
});
