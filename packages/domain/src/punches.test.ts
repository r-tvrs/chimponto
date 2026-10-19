import { describe, expect, it } from "vitest";
import { fromLocal, toLocalTime } from "./local-time";
import { daySlots, initialDraft, isDuplicateMinute, labelDay, labelDraftDay } from "./punches";

/** Batidas sintéticas de um dia local de São Paulo, na ordem em que foram registradas. */
function day(date: string, ...times: string[]) {
  return times.map((time, i) => ({ id: `p${i + 1}`, punchedAt: fromLocal(date, time)! }));
}

const TODAY = "2026-10-16";
const NOW = fromLocal(TODAY, "20:00")!;

function labelsOf(date: string, ...times: string[]) {
  return labelDay(day(date, ...times), NOW).map(({ label }) => label);
}

describe("labelDay", () => {
  it.each([
    [["09:02"], ["entry"]],
    [
      ["09:02", "13:28", "14:28"],
      ["entry", "lunch_out", "lunch_return"],
    ],
    [
      ["09:02", "13:28", "14:28", "18:05"],
      ["entry", "lunch_out", "lunch_return", "exit"],
    ],
    [
      ["08:00", "12:00", "13:00", "15:00", "15:30", "18:00"],
      ["entry", "lunch_out", "lunch_return", "exit", "extra_out", "extra_return"],
    ],
    [
      ["08:00", "12:00", "13:00", "15:00", "15:30", "16:00", "16:30"],
      ["entry", "lunch_out", "lunch_return", "exit", "extra_out", "extra_return", "extra_out"],
    ],
  ])("labels %j by position: %j", (times, expected) => {
    expect(labelsOf(TODAY, ...times)).toEqual(expected);
  });

  it("sorts by time, so punches can be registered in any order", () => {
    // Entrada e saída durante o dia; o almoço lançado à noite.
    const labeled = labelDay(day(TODAY, "09:00", "18:00", "13:00", "12:00"), NOW);

    expect(labeled.map(({ punch, label }) => [punch.id, label])).toEqual([
      ["p1", "entry"],
      ["p4", "lunch_out"],
      ["p3", "lunch_return"],
      ["p2", "exit"],
    ]);
  });

  describe("day with exactly 2 punches", () => {
    it("is entry and lunch out today, up to 360 min apart", () => {
      expect(labelsOf(TODAY, "09:00", "15:00")).toEqual(["entry", "lunch_out"]);
    });

    it("is entry and exit when more than 360 min apart", () => {
      expect(labelsOf(TODAY, "09:00", "15:01")).toEqual(["entry", "exit"]);
    });

    it("is entry and exit on a past day", () => {
      expect(labelsOf("2026-10-15", "09:00", "12:00")).toEqual(["entry", "exit"]);
    });
  });

  it("returns nothing for a day without punches", () => {
    expect(labelDay([], NOW)).toEqual([]);
  });
});

describe("isDuplicateMinute", () => {
  const morning = day(TODAY, "09:02", "13:28");

  it("finds a punch in the same minute, ignoring seconds", () => {
    const at = new Date(fromLocal(TODAY, "13:28")!.getTime() + 45_000);
    expect(isDuplicateMinute(morning, { at })).toBe(true);
  });

  it("allows a free minute", () => {
    expect(isDuplicateMinute(morning, { at: fromLocal(TODAY, "13:29")! })).toBe(false);
  });

  it("does not count the punch being edited against itself", () => {
    const at = fromLocal(TODAY, "09:02")!;
    expect(isDuplicateMinute(morning, { at, editingId: "p1" })).toBe(false);
    expect(isDuplicateMinute(morning, { at, editingId: "p2" })).toBe(true);
  });
});

describe("daySlots", () => {
  /** Cada slot como "rótulo" (feito: "rótulo hora"), com a próxima marcada por "*". */
  function slotsOf(now: string, ...times: string[]) {
    const date = fromLocal(TODAY, now)!;
    return daySlots(day(TODAY, ...times), date).slots.map((slot) =>
      slot.kind === "done"
        ? `${slot.label} ${slot.punch.id}`
        : slot.kind === "next"
          ? `*${slot.label}`
          : slot.label,
    );
  }

  it("is four pending slots on an empty day, the first one next", () => {
    expect(slotsOf("08:55")).toEqual(["*entry", "lunch_out", "lunch_return", "exit"]);
  });

  it("follows the done punches with what is left of the day", () => {
    expect(slotsOf("14:28", "09:02", "13:28")).toEqual([
      "entry p1",
      "lunch_out p2",
      "*lunch_return",
      "exit",
    ]);
  });

  it("names the next slot after what a punch now would be", () => {
    // Uma batida às 16:00, 6h58 depois da entrada, seria a saída (exceção de 2 batidas).
    expect(slotsOf("16:00", "09:02")).toEqual(["entry p1", "*exit", "lunch_out", "lunch_return"]);
  });

  it("shows the missing lunch on a day with only entry and exit", () => {
    expect(slotsOf("19:00", "09:00", "18:00")).toEqual([
      "entry p1",
      "exit p2",
      "*lunch_return",
      "lunch_out",
    ]);
  });

  it("has no pending slot on an even day of 4 or more", () => {
    expect(slotsOf("19:00", "09:00", "12:00", "13:00", "18:00")).toEqual([
      "entry p1",
      "lunch_out p2",
      "lunch_return p3",
      "exit p4",
    ]);
  });

  it("waits for the extra return on an odd day past 4", () => {
    expect(slotsOf("19:00", "08:00", "12:00", "13:00", "15:00", "15:30")).toEqual([
      "entry p1",
      "lunch_out p2",
      "lunch_return p3",
      "exit p4",
      "extra_out p5",
      "*extra_return",
    ]);
  });

  it("gives the next label, the same as the next slot, even when no slot is pending", () => {
    const at = fromLocal(TODAY, "19:00")!;
    expect(daySlots(day(TODAY, "09:02", "13:28"), at).next).toBe("lunch_return");
    expect(daySlots(day(TODAY, "09:00", "12:00", "13:00", "18:00"), at).next).toBe("extra_out");
  });
});

describe("initialDraft", () => {
  const PAST = "2026-10-14";
  /** Linhas iniciais como `id@HH:MM`, ou só o id numa linha sem hora. */
  function rows(...times: string[]) {
    let seq = 0;
    return initialDraft(day(PAST, ...times), () => `new${++seq}`).map(({ id, punchedAt }) =>
      punchedAt ? `${id}@${toLocalTime(punchedAt)}` : id,
    );
  }

  it("puts the punches in time order, then empty rows up to 4", () => {
    expect(rows("13:00", "09:00", "12:00")).toEqual(["p2@09:00", "p3@12:00", "p1@13:00", "new1"]);
    expect(rows()).toEqual(["new1", "new2", "new3", "new4"]);
  });

  it("pads 5+ punches to the next even count (docs/02 §2.1)", () => {
    expect(rows("09:00", "12:00", "13:00", "18:00", "19:00")).toHaveLength(6);
    expect(rows("09:00", "12:00", "13:00", "18:00", "19:00", "19:30")).toEqual([
      "p1@09:00",
      "p2@12:00",
      "p3@13:00",
      "p4@18:00",
      "p5@19:00",
      "p6@19:30",
    ]);
  });
});

describe("labelDraftDay", () => {
  const PAST = "2026-10-14";
  /** Linhas do rascunho da tela Dia, na ordem da tela; `null` é uma linha sem hora. */
  function draft(...times: (string | null)[]) {
    return times.map((time, i) => ({
      id: `r${i + 1}`,
      punchedAt: time === null ? null : fromLocal(PAST, time)!,
    }));
  }
  const labels = (...times: (string | null)[]) =>
    labelDraftDay(draft(...times), NOW).map(({ label }) => label);

  it("labels filled rows by time, keeping the screen order", () => {
    expect(labels("13:00", "09:00", "18:00", "12:00")).toEqual([
      "lunch_return",
      "entry",
      "exit",
      "lunch_out",
    ]);
  });

  it.each([
    [
      ["09:00", "12:00", "13:00", null],
      ["entry", "lunch_out", "lunch_return", "exit"],
    ],
    [
      [null, null, null, null],
      ["entry", "lunch_out", "lunch_return", "exit"],
    ],
    [
      ["09:00", "18:00", null, null],
      ["entry", "exit", "lunch_out", "lunch_return"],
    ],
    [
      ["08:00", "12:00", "13:00", "15:00", null, null],
      ["entry", "lunch_out", "lunch_return", "exit", "extra_out", "extra_return"],
    ],
  ])("gives empty rows the labels %j still misses: %j", (times, expected) => {
    expect(labels(...times)).toEqual(expected);
  });

  it("flags rows that share a minute with another row (docs/02 §2)", () => {
    const rows = labelDraftDay(draft("09:00", "12:00", "09:00", null, null), NOW);
    expect(rows.map(({ duplicate }) => duplicate)).toEqual([true, false, true, false, false]);
  });
});
