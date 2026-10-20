import { describe, expect, it } from "vitest";
import { type CompanyRules, companyRulesSchema } from "./company-rules";
import { fromLocal } from "./local-time";
import { periodContaining } from "./period";
import { summarizePeriod } from "./period-summary";
import type { DayMark } from "./day-summary";

const RULES = companyRulesSchema.parse({});
// 20/09/2026 (dom) a 19/10/2026 (seg).
const PERIOD = periodContaining("2026-10-16", RULES);
const NOW = fromLocal("2026-10-16", "14:28")!;

let seq = 0;
/** Batidas sintéticas de um dia local de São Paulo. */
function day(date: string, ...times: string[]) {
  return times.map((time) => ({ id: `p${++seq}`, punchedAt: fromLocal(date, time)! }));
}

/** Dia de 8h com o saldo pedido (dentro da tolerância some), almoço de 1h. */
function workday(date: string, balance: number) {
  const exit = 18 * 60 + balance;
  const hhmm = `${String(Math.floor(exit / 60)).padStart(2, "0")}:${String(exit % 60).padStart(2, "0")}`;
  return day(date, "09:00", "12:00", "13:00", hhmm);
}

function summary(
  punches: ReturnType<typeof day>,
  rules: Partial<CompanyRules> = {},
  now = NOW,
  marks: DayMark[] = [],
) {
  return summarizePeriod(punches, PERIOD, companyRulesSchema.parse(rules), now, marks);
}

const statusOf = (s: ReturnType<typeof summary>, date: string) =>
  s.days.find((d) => d.date === date)?.status;

describe("summarizePeriod, days", () => {
  it("lists every day of the period, with past workdays without punches pending and the days ahead future", () => {
    const s = summary(workday("2026-10-15", 0));

    expect(s.days).toHaveLength(30);
    expect(s.days[0]!.date).toBe("2026-09-20");
    expect(s.days.at(-1)!.date).toBe("2026-10-19");
    expect(statusOf(s, "2026-10-15")).toBe("complete");
    expect(statusOf(s, "2026-10-14")).toBe("pending");
    expect(statusOf(s, "2026-10-11")).toBe("off"); // domingo
    expect(statusOf(s, "2026-10-16")).toBe("in_progress"); // hoje
    expect(statusOf(s, "2026-10-17")).toBe("future");
    expect(statusOf(s, "2026-10-19")).toBe("future");
  });
});

describe("summarizePeriod, totals day by day (compensateWithinPeriod = false)", () => {
  const punches = [
    ...workday("2026-10-13", 40), // ter
    ...workday("2026-10-14", -57), // qua
    ...workday("2026-10-15", 5), // qui, dentro da tolerância
    ...day("2026-10-10", "09:00", "11:00"), // sáb, 2h
    ...day("2026-10-11", "10:00", "11:30"), // dom, 1h30
  ];

  it("splits the overtime by kind and sums the deficit", () => {
    expect(summary(punches)).toMatchObject({
      overtimeMinutes: { weekday: 40, saturday: 120, sundayHoliday: 90 },
      deficitMinutes: 57,
      netBalance: 40 - 57 + 120 + 90,
    });
  });

  it("leaves today out until it is complete", () => {
    const open = [...punches, ...day("2026-10-16", "08:00", "12:00", "13:00")];
    expect(summary(open).overtimeMinutes.weekday).toBe(40);

    const closed = [...punches, ...workday("2026-10-16", 30)];
    expect(summary(closed, {}, fromLocal("2026-10-16", "19:00")!).overtimeMinutes.weekday).toBe(70);
  });

  it("leaves future days out, even with punches", () => {
    expect(summary([...punches, ...workday("2026-10-19", 60)]).overtimeMinutes.weekday).toBe(40);
  });
});

describe("summarizePeriod, pending and incomplete days", () => {
  it("counts past pending and incomplete days, never today or the days ahead", () => {
    const punches = [
      ...day("2026-10-14", "09:00", "12:00", "13:00"), // ímpar
      ...day("2026-10-13", "09:00", "18:00"), // sem almoço
      ...day("2026-10-16", "08:00", "17:00"), // hoje, sem almoço
      ...day("2026-10-19", "09:00"), // futuro
    ];
    const s = summary(punches);

    // Dias úteis passados sem batidas: 21/09–09/10 (15) + 12/10 e 15/10.
    expect(s.pendingDays).toBe(17);
    expect(s.incompleteDays).toBe(2);
    expect(statusOf(s, "2026-10-16")).toBe("incomplete");
    expect(s.days.find((d) => d.date === "2026-10-14")?.punchCount).toBe(3);
    expect(s.days.filter((d) => d.unresolved).map((d) => d.date)).toHaveLength(19);
    expect(s.days.find((d) => d.date === "2026-10-16")?.unresolved).toBe(false);
  });
});

describe("summarizePeriod, compensating within the period (compensateWithinPeriod = true)", () => {
  const compensate = { compensateWithinPeriod: true };

  it("nets the balances: a positive result is weekday overtime", () => {
    const punches = [
      ...workday("2026-10-13", 40),
      ...workday("2026-10-14", -15),
      ...day("2026-10-10", "09:00", "10:00"), // sáb, 1h: compensa como dia útil
    ];
    expect(summary(punches, compensate)).toMatchObject({
      overtimeMinutes: { weekday: 85, saturday: 0, sundayHoliday: 0 },
      deficitMinutes: 0,
      netBalance: 85,
    });
  });

  it("nets the balances: a negative result is deficit", () => {
    const punches = [...workday("2026-10-13", 20), ...workday("2026-10-14", -57)];
    expect(summary(punches, compensate)).toMatchObject({
      overtimeMinutes: { weekday: 0, saturday: 0, sundayHoliday: 0 },
      deficitMinutes: 37,
      netBalance: -37,
    });
  });

  it("keeps Sunday hours at 100% without compensating the deficit", () => {
    const punches = [
      ...workday("2026-10-14", -57),
      ...day("2026-10-11", "10:00", "12:00"), // dom, 2h
    ];
    expect(summary(punches, compensate)).toMatchObject({
      overtimeMinutes: { weekday: 0, saturday: 0, sundayHoliday: 120 },
      deficitMinutes: 57,
      netBalance: 63,
    });
  });
});

describe("summarizePeriod, day marks", () => {
  it("counts absences without deficit and gives each day its mark", () => {
    const marks: DayMark[] = [
      { date: "2026-10-13", type: "falta" },
      { date: "2026-10-14", type: "atestado" },
      { date: "2026-10-19", type: "falta" }, // futuro
    ];
    const s = summary(workday("2026-10-15", -30), {}, NOW, marks);

    expect(s).toMatchObject({ deficitMinutes: 30, absenceDays: 1 });
    expect(s.days.find((d) => d.date === "2026-10-13")).toMatchObject({
      mark: "falta",
      status: "off",
      unresolved: false,
    });
    expect(s.days.find((d) => d.date === "2026-10-14")?.mark).toBe("atestado");
    expect(s.days.find((d) => d.date === "2026-10-15")?.mark).toBeNull();
    // Dias úteis passados sem batidas: 21/09–09/10 (15) + 12/10.
    expect(s.pendingDays).toBe(16);
  });

  it("turns punches on a marked weekday into weekday overtime", () => {
    const marks: DayMark[] = [{ date: "2026-10-14", type: "ferias" }];
    expect(summary(day("2026-10-14", "09:00", "11:00"), {}, NOW, marks)).toMatchObject({
      overtimeMinutes: { weekday: 120, saturday: 0, sundayHoliday: 0 },
      deficitMinutes: 0,
    });
  });

  it("turns minutes worked on a day marked as feriado into Sunday/holiday overtime, even on a Saturday", () => {
    const marks: DayMark[] = [
      { date: "2026-10-12", type: "feriado" }, // seg
      { date: "2026-10-10", type: "feriado" }, // sáb
    ];
    const punches = [
      ...day("2026-10-12", "09:00", "11:00"),
      ...day("2026-10-10", "09:00", "10:00"),
    ];
    const s = summary(punches, {}, NOW, marks);

    expect(s.overtimeMinutes).toEqual({ weekday: 0, saturday: 0, sundayHoliday: 180 });
    expect(s.days.find((d) => d.date === "2026-10-12")?.mark).toBe("feriado");
  });
});
