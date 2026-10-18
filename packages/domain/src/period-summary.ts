import type { CompanyRules } from "./company-rules";
import { type DayRules, type DayStatus, type DaySummary, summarizeDay } from "./day-summary";
import { addDays, type LocalDate, toLocalDate, weekdayOf } from "./local-time";
import type { Period } from "./period";
import type { DayPunch } from "./punches";

// Saldo do período (docs/02 §6).

/** `future`: depois de hoje, fora de tudo, mesmo com batidas. */
export type PeriodDayStatus = DayStatus | "future";

export type PeriodDay = {
  date: LocalDate;
  status: PeriodDayStatus;
  summary: DaySummary;
  punchCount: number;
  /** Dia passado `pending` ou `incomplete`: o que falta resolver. Hoje e os futuros, nunca. */
  unresolved: boolean;
};

/** Tipo de adicional da hora extra (docs/02 §1). Feriados chegam com o #11. */
export type OvertimeKind = "weekday" | "saturday" | "sundayHoliday";

export type PeriodSummary = {
  /** Todos os dias do período, em ordem. */
  days: PeriodDay[];
  /** Soma dos saldos dos dias fechados (`complete`) até hoje. */
  netBalance: number;
  overtimeMinutes: Record<OvertimeKind, number>;
  deficitMinutes: number;
  /** Dias passados `pending` e `incomplete`; hoje e os futuros não entram. */
  pendingDays: number;
  incompleteDays: number;
};

function overtimeKindOf(date: LocalDate): OvertimeKind {
  const weekday = weekdayOf(date);
  return weekday === "sat" ? "saturday" : weekday === "sun" ? "sundayHoliday" : "weekday";
}

export type PeriodSummaryRules = DayRules & Pick<CompanyRules, "compensateWithinPeriod">;

/** Resumo do período com as batidas recebidas (as de fora dele são ignoradas). */
export function summarizePeriod(
  punches: DayPunch[],
  period: Period,
  rules: PeriodSummaryRules,
  now: Date,
): PeriodSummary {
  const today = toLocalDate(now);
  const byDate = new Map<LocalDate, DayPunch[]>();
  for (const punch of punches) {
    const date = toLocalDate(punch.punchedAt);
    byDate.set(date, [...(byDate.get(date) ?? []), punch]);
  }

  const days: PeriodDay[] = [];
  for (let date = period.start; date <= period.end; date = addDays(date, 1)) {
    const dayPunches = byDate.get(date) ?? [];
    const summary = summarizeDay(dayPunches, date, rules, now);
    const status = date > today ? "future" : summary.status;
    const unresolved = date < today && (status === "pending" || status === "incomplete");
    days.push({ date, status, summary, punchCount: dayPunches.length, unresolved });
  }

  const closed = days.flatMap(({ date, status, summary }) =>
    status === "complete" && summary.balance !== null
      ? [{ kind: overtimeKindOf(date), balance: summary.balance }]
      : [],
  );
  const overtimeMinutes: Record<OvertimeKind, number> = {
    weekday: 0,
    saturday: 0,
    sundayHoliday: 0,
  };
  let deficitMinutes = 0;
  if (rules.compensateWithinPeriod) {
    // Tudo se compensa, menos as horas de domingo/feriado, que ficam com o adicional de 100%.
    let net = 0;
    for (const { kind, balance } of closed) {
      if (kind === "sundayHoliday" && balance > 0) overtimeMinutes.sundayHoliday += balance;
      else net += balance;
    }
    if (net > 0) overtimeMinutes.weekday = net;
    else deficitMinutes = -net;
  } else {
    for (const { kind, balance } of closed) {
      if (balance > 0) overtimeMinutes[kind] += balance;
      else deficitMinutes -= balance;
    }
  }

  const unresolved = days.filter((d) => d.unresolved);
  return {
    days,
    netBalance: closed.reduce((sum, { balance }) => sum + balance, 0),
    overtimeMinutes,
    deficitMinutes,
    pendingDays: unresolved.filter((d) => d.status === "pending").length,
    incompleteDays: unresolved.filter((d) => d.status === "incomplete").length,
  };
}
