import { describe, expect, it } from "vitest";
import { companyRulesSchema } from "./company-rules";
import { previewPunch, summarizeDay } from "./day-summary";
import { fromLocal } from "./local-time";

/** Batidas sintéticas de um dia local de São Paulo, na ordem em que foram registradas. */
function day(date: string, ...times: string[]) {
  return times.map((time, i) => ({ id: `p${i + 1}`, punchedAt: fromLocal(date, time)! }));
}

const FRIDAY = "2026-10-16";
const SATURDAY = "2026-10-17";
const RULES = companyRulesSchema.parse({});
const at = (date: string, time: string) => fromLocal(date, time)!;

function summary(date: string, times: string[], now = at(date, "23:00"), rules = RULES) {
  return summarizeDay(day(date, ...times), date, rules, now);
}

describe("summarizeDay, complete day", () => {
  it("sums the pairs and compares them with the company's journey", () => {
    expect(summary(FRIDAY, ["09:03", "13:00", "14:05", "18:30"])).toMatchObject({
      status: "complete",
      workedMinutes: 502,
      expectedMinutes: 480,
      rawBalance: 22,
      balance: 22,
    });
  });

  it.each([
    ["18:10", 10, 0],
    ["17:50", -10, 0],
    ["18:11", 11, 11],
    ["17:49", -11, -11],
  ])("exit at %s: raw %i becomes %i with the daily tolerance", (exit, raw, balance) => {
    // 09:00–12:00 e 13:00–exit: 3h + (exit − 13:00).
    expect(summary(FRIDAY, ["09:00", "12:00", "13:00", exit])).toMatchObject({
      rawBalance: raw,
      balance,
    });
  });

  it("counts every minute on a day without a journey, with no tolerance", () => {
    expect(summary(SATURDAY, ["09:00", "10:00", "10:30", "10:35"])).toMatchObject({
      status: "complete",
      workedMinutes: 65,
      expectedMinutes: 0,
      rawBalance: 65,
      balance: 65,
    });
  });

  it("keeps a small balance on a day without a journey", () => {
    expect(summary(SATURDAY, ["09:00", "09:03", "10:00", "10:02"])).toMatchObject({
      rawBalance: 5,
      balance: 5,
    });
  });

  it("follows the company's journey and workdays", () => {
    const rules = companyRulesSchema.parse({ dailyMinutes: 360, workdays: ["sat"] });

    expect(summary(SATURDAY, ["09:00", "12:00", "13:00", "16:00"], undefined, rules)).toMatchObject(
      { expectedMinutes: 360, balance: 0 },
    );
    expect(summary(FRIDAY, [], undefined, rules)).toMatchObject({ expectedMinutes: 0 });
  });
});

describe("summarizeDay, status", () => {
  const thursday = "2026-10-15";

  it.each([
    ["no punches yet", [], "14:00"],
    ["entry", ["09:02"], "14:00"],
    ["at lunch", ["09:02", "13:28"], "14:00"],
    ["back from lunch", ["09:02", "13:28", "14:28"], "15:00"],
  ])("is in progress today with %s, out of the calculation", (_, times, now) => {
    expect(summary(FRIDAY, times, at(FRIDAY, now))).toMatchObject({
      status: "in_progress",
      rawBalance: null,
      balance: null,
    });
  });

  it("counts only the closed pairs while the day is open", () => {
    expect(summary(FRIDAY, ["09:02", "13:28", "14:28"], at(FRIDAY, "15:00"))).toMatchObject({
      workedMinutes: 266,
    });
  });

  it("is incomplete on a past day with an odd number of punches", () => {
    expect(summary(thursday, ["09:02", "13:28", "14:28"], at(FRIDAY, "08:00"))).toMatchObject({
      status: "incomplete",
      balance: null,
      alerts: [{ kind: "odd_punches" }],
    });
  });

  it("is incomplete with entry and exit more than 6h apart, missing the lunch", () => {
    expect(summary(FRIDAY, ["09:00", "18:00"], at(FRIDAY, "18:30"))).toMatchObject({
      status: "incomplete",
      workedMinutes: 540,
      balance: null,
      alerts: [{ kind: "missing_lunch" }],
    });
  });

  it("closes a past day with entry and exit up to 6h apart", () => {
    expect(summary(thursday, ["09:00", "13:00"], at(FRIDAY, "08:00"))).toMatchObject({
      status: "complete",
      balance: -240,
      alerts: [],
    });
  });

  it("is off on a day without a journey and without punches", () => {
    expect(summary(SATURDAY, [], at(SATURDAY, "10:00"))).toMatchObject({
      status: "off",
      expectedMinutes: 0,
      balance: null,
    });
  });

  it("is in progress on a day off once there are punches", () => {
    expect(summary(SATURDAY, ["09:00"], at(SATURDAY, "10:00"))).toMatchObject({
      status: "in_progress",
    });
  });

  it("closes an even day past 4 punches", () => {
    expect(summary(FRIDAY, ["08:00", "12:00", "13:00", "16:00", "16:30", "17:30"])).toMatchObject({
      status: "complete",
      workedMinutes: 480,
      balance: 0,
    });
  });
});

describe("summarizeDay, alerts", () => {
  it("warns about a lunch shorter than expected, with its minutes", () => {
    expect(summary(FRIDAY, ["09:02", "13:28", "14:21", "18:05"])).toMatchObject({
      alerts: [{ kind: "short_lunch", minutes: 53 }],
    });
  });

  it("warns as soon as the lunch return is punched", () => {
    expect(summary(FRIDAY, ["09:02", "13:28", "14:21"], at(FRIDAY, "15:00")).alerts).toEqual([
      { kind: "short_lunch", minutes: 53 },
    ]);
  });

  it("accepts a lunch of exactly the expected minutes", () => {
    expect(summary(FRIDAY, ["09:02", "13:28", "14:28", "18:05"]).alerts).toEqual([]);
  });
});

describe("summarizeDay, pending", () => {
  it("leaves a past workday without punches pending, not as an absence", () => {
    expect(summary("2026-10-15", [], at(FRIDAY, "08:00"))).toMatchObject({
      status: "pending",
      expectedMinutes: 480,
      balance: null,
    });
  });
});

describe("summarizeDay, day marks", () => {
  const THURSDAY = "2026-10-15";

  it.each(["atestado", "ferias", "folga_compensada", "abono", "falta"] as const)(
    "%s zeroes the expected journey: a past workday without punches is off, not pending",
    (mark) => {
      const s = summarizeDay([], THURSDAY, RULES, at(FRIDAY, "10:00"), mark);
      expect(s).toMatchObject({ status: "off", expectedMinutes: 0, workedMinutes: 0 });
    },
  );

  it("keeps counting punches on a marked day, without tolerance", () => {
    const punches = day(THURSDAY, "09:00", "09:08");
    expect(summarizeDay(punches, THURSDAY, RULES, at(FRIDAY, "10:00"), "atestado")).toMatchObject({
      status: "complete",
      workedMinutes: 8,
      expectedMinutes: 0,
      balance: 8,
    });
  });
});

describe("summarizeDay, next punch", () => {
  it("expects the lunch return one expected lunch after the lunch out", () => {
    // docs/02 §7: saída do almoço 13:28 → volta 14:28.
    expect(summary(FRIDAY, ["09:02", "13:28"], at(FRIDAY, "14:21")).next).toEqual({
      label: "lunch_return",
      at: at(FRIDAY, "14:28"),
      minutesUntil: 7,
    });
  });

  it("expects the exit after the journey plus the real lunch", () => {
    // docs/02 §7: entrada 09:03, almoço 13:00–14:05 → saída 18:08.
    expect(summary(FRIDAY, ["09:03", "13:00", "14:05"], at(FRIDAY, "15:08")).next).toEqual({
      label: "exit",
      at: at(FRIDAY, "18:08"),
      minutesUntil: 180,
    });
  });

  it("rounds the minutes until it up, and goes negative once it's late", () => {
    const late = summary(FRIDAY, ["09:02", "13:28"], at(FRIDAY, "14:30"));
    const early = summarizeDay(
      day(FRIDAY, "09:02", "13:28"),
      FRIDAY,
      RULES,
      new Date(at(FRIDAY, "14:21").getTime() + 30_000),
    );

    expect(late.next?.minutesUntil).toBe(-2);
    expect(early.next?.minutesUntil).toBe(7);
  });

  it.each([
    ["no punches", []],
    ["entry", ["09:02"]],
  ])("has no time for a free punch (%s)", (_, times) => {
    expect(summary(FRIDAY, times, at(FRIDAY, "10:00")).next).toMatchObject({ at: null });
  });

  it("is the label a punch now would take", () => {
    expect(summary(FRIDAY, ["09:02"], at(FRIDAY, "10:00")).next?.label).toBe("lunch_out");
    expect(summary(FRIDAY, [], at(FRIDAY, "10:00")).next?.label).toBe("entry");
  });

  it("has no time on a day without a journey", () => {
    expect(summary(SATURDAY, ["09:00", "12:00", "13:00"], at(SATURDAY, "14:00")).next).toEqual({
      label: "exit",
      at: null,
      minutesUntil: null,
    });
  });

  it("has no lunch return when the lunch out comes after the journey", () => {
    // docs/02 §7: só se t2 < t1 + dailyMinutes.
    const rules = companyRulesSchema.parse({ dailyMinutes: 300 });

    expect(summary(FRIDAY, ["09:00", "14:00"], at(FRIDAY, "14:10"), rules).next).toMatchObject({
      label: "lunch_return",
      at: null,
    });
  });

  it("is gone once the day closes", () => {
    expect(summary(FRIDAY, ["09:02", "13:28", "14:28", "18:05"]).next).toBeNull();
  });
});

describe("summarizeDay, forecast", () => {
  it("forecasts the exit with the expected lunch before the lunch return", () => {
    expect(summary(FRIDAY, ["09:00"], at(FRIDAY, "10:00")).forecast).toEqual({
      exit: at(FRIDAY, "18:00"),
    });
    expect(summary(FRIDAY, ["09:00", "12:30"], at(FRIDAY, "12:40")).forecast).toEqual({
      lunch_return: at(FRIDAY, "13:30"),
      exit: at(FRIDAY, "18:00"),
    });
  });

  it("forecasts nothing without punches, on a closed day or on a day missing the lunch", () => {
    expect(summary(FRIDAY, [], at(FRIDAY, "08:00")).forecast).toEqual({});
    expect(summary(FRIDAY, ["09:00", "18:00"], at(FRIDAY, "18:10")).forecast).toEqual({});
    expect(summary(FRIDAY, ["09:02", "13:28", "14:28", "18:05"]).forecast).toEqual({});
  });
});

describe("previewPunch, label", () => {
  const TODAY = FRIDAY;
  const morning = day(TODAY, "09:02", "13:28");
  const NOW = at(TODAY, "20:00");

  it.each([
    ["14:28", "lunch_return"],
    ["08:30", "entry"],
    ["11:00", "lunch_out"],
  ])("a new punch at %s goes in as %s", (time, expected) => {
    const preview = previewPunch(morning, { at: fromLocal(TODAY, time)! }, RULES, NOW);
    expect(preview.label).toBe(expected);
  });

  it("is the first punch of another day, ignoring today's punches", () => {
    const preview = previewPunch(morning, { at: fromLocal("2026-10-15", "18:00")! }, RULES, NOW);
    expect(preview.label).toBe("entry");
  });

  it("relabels an edited punch at its new time, without counting its old one", () => {
    // A entrada (p1) editada para depois da saída do almoço vira a saída do almoço.
    const preview = previewPunch(
      morning,
      { at: fromLocal(TODAY, "14:00")!, editingId: "p1" },
      RULES,
      NOW,
    );
    expect(preview.label).toBe("lunch_out");
  });

  it("applies the 2-punch exception: a second punch more than 360 min after the entry is the exit", () => {
    const preview = previewPunch(
      day(TODAY, "09:00"),
      { at: fromLocal(TODAY, "18:00")! },
      RULES,
      NOW,
    );
    expect(preview.label).toBe("exit");
  });
});

describe("previewPunch, live warnings", () => {
  const NOW = at(FRIDAY, "20:00");

  it("warns about a short lunch on the lunch return, with the expected return", () => {
    const preview = previewPunch(
      day(FRIDAY, "09:02", "13:28"),
      { at: at(FRIDAY, "14:21") },
      RULES,
      NOW,
    );

    expect(preview).toEqual({
      label: "lunch_return",
      shortLunch: { minutes: 53, returnAt: at(FRIDAY, "14:28") },
      dayBalance: null,
    });
  });

  it("warns when an edited lunch out shortens the lunch", () => {
    const punches = day(FRIDAY, "09:02", "13:28", "14:28");
    const preview = previewPunch(punches, { at: at(FRIDAY, "13:40"), editingId: "p2" }, RULES, NOW);

    expect(preview.shortLunch).toEqual({ minutes: 48, returnAt: at(FRIDAY, "14:40") });
  });

  it("has no warning for a full lunch", () => {
    const preview = previewPunch(
      day(FRIDAY, "09:02", "13:28"),
      { at: at(FRIDAY, "14:28") },
      RULES,
      NOW,
    );

    expect(preview.shortLunch).toBeNull();
  });

  it.each([
    ["18:08", 0],
    ["18:30", 22],
    ["17:30", -38],
  ])("gives the day's balance with an exit at %s: %i", (time, balance) => {
    const punches = day(FRIDAY, "09:03", "13:00", "14:05");

    expect(previewPunch(punches, { at: at(FRIDAY, time) }, RULES, NOW).dayBalance).toBe(balance);
  });

  it("gives the balance when an edit of the exit keeps the day closed", () => {
    const punches = day(FRIDAY, "09:03", "13:00", "14:05", "18:08");
    const preview = previewPunch(punches, { at: at(FRIDAY, "18:30"), editingId: "p4" }, RULES, NOW);

    expect(preview.dayBalance).toBe(22);
  });

  it("gives the balance when a new punch in the middle of the day closes it", () => {
    // Saída ao médico às 15:00 já batida; a volta às 16:00 fecha o dia, antes da saída das 18:30.
    const punches = day(FRIDAY, "09:03", "13:00", "14:05", "15:00", "18:30");
    const preview = previewPunch(punches, { at: at(FRIDAY, "16:00") }, RULES, NOW);

    // 3h57 + 0h55 + 2h30 = 7h22 trabalhadas.
    expect(preview.dayBalance).toBe(-38);
  });

  it("has no balance for a punch that doesn't close the day", () => {
    const punches = day(FRIDAY, "09:03", "13:00", "14:05", "18:08");

    expect(
      previewPunch(day(FRIDAY, "09:03"), { at: at(FRIDAY, "12:00") }, RULES, NOW).dayBalance,
    ).toBeNull();
    // Editar a entrada de um dia fechado não é a batida que fecha o dia.
    expect(
      previewPunch(punches, { at: at(FRIDAY, "09:00"), editingId: "p1" }, RULES, NOW).dayBalance,
    ).toBeNull();
  });
});
