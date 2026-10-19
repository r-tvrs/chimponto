import type { CompanyRules } from "./company-rules";
import { type LocalDate, MINUTE_MS, toLocalDate, truncateToMinute, weekdayOf } from "./local-time";
import {
  type DayPunch,
  labelCandidate,
  type PunchCandidate,
  labelDay,
  MAX_MINUTES_WITHOUT_LUNCH,
  type PunchLabel,
} from "./punches";

// Cálculo do dia (docs/02 §3 e §4).

export type DayRules = Pick<
  CompanyRules,
  "dailyMinutes" | "expectedLunchMinutes" | "dailyToleranceMinutes" | "workdays"
>;

/** Tipo do dia marcado à mão (§3.1). Sem marcação, o dia é Normal. */
export const DAY_MARK_TYPES = ["falta", "atestado", "ferias", "folga_compensada", "abono"] as const;
export type DayMarkType = (typeof DAY_MARK_TYPES)[number];
export type DayMark = { date: LocalDate; type: DayMarkType };

/**
 * `in_progress`: hoje (ou adiante) com o dia ainda aberto. `incomplete`: batidas que não fecham o
 * dia (§3.2). `pending`: dia útil passado sem batidas (§3.2). `off`: sem jornada e sem batidas.
 */
export type DayStatus = "in_progress" | "complete" | "incomplete" | "pending" | "off";

/** Avisos do dia (§3.3); não alteram o cálculo. */
export type DayAlert =
  { kind: "short_lunch"; minutes: number } | { kind: "missing_lunch" } | { kind: "odd_punches" };

export type DaySummary = {
  status: DayStatus;
  /** Soma dos pares fechados (entrada → saída). */
  workedMinutes: number;
  expectedMinutes: number;
  /** Só com o dia `complete`; nos outros, o dia fica fora do cálculo. */
  rawBalance: number | null;
  balance: number | null;
  alerts: DayAlert[];
  /** A batida de agora (o mesmo rótulo do CTA), com a hora prevista quando há; null no dia fechado. */
  next: NextPunch | null;
  /** Horas previstas das batidas que faltam, para as linhas pendentes do card (§7). */
  forecast: Partial<Record<PunchLabel, Date>>;
};

/** `minutesUntil` arredonda para cima; negativo quando a hora prevista já passou. */
export type NextPunch =
  | { label: PunchLabel; at: Date; minutesUntil: number }
  | { label: PunchLabel; at: null; minutesUntil: null };

const minutesBetween = (from: Date, to: Date) => (to.getTime() - from.getTime()) / MINUTE_MS;

/**
 * Resumo do dia local `date`, com as batidas desse dia em qualquer ordem. Dia marcado (`mark`) não
 * tem jornada; as batidas nele contam, sem tolerância (§3).
 */
export function summarizeDay(
  punches: DayPunch[],
  date: LocalDate,
  rules: DayRules,
  now: Date,
  mark: DayMarkType | null = null,
): DaySummary {
  const labeled = labelDay(punches, now);
  const times = labeled.map(({ punch }) => punch.punchedAt);
  const timeOf = (label: PunchLabel) => labeled.find((p) => p.label === label)?.punch.punchedAt;
  const expectedMinutes =
    !mark && rules.workdays.includes(weekdayOf(date)) ? rules.dailyMinutes : 0;
  const isPast = date < toLocalDate(now);

  let workedMinutes = 0;
  for (let i = 0; i + 1 < times.length; i += 2) {
    workedMinutes += minutesBetween(times[i]!, times[i + 1]!);
  }

  const alerts: DayAlert[] = [];
  const lunchOut = timeOf("lunch_out");
  const lunchReturn = timeOf("lunch_return");
  if (lunchOut && lunchReturn) {
    const lunch = minutesBetween(lunchOut, lunchReturn);
    if (lunch < rules.expectedLunchMinutes) alerts.push({ kind: "short_lunch", minutes: lunch });
  }

  let status: DayStatus;
  if (times.length === 0) {
    status = expectedMinutes === 0 ? "off" : isPast ? "pending" : "in_progress";
  } else if (times.length % 2 === 1) {
    status = isPast ? "incomplete" : "in_progress";
    if (isPast) alerts.push({ kind: "odd_punches" });
  } else if (labeled.at(-1)!.label === "lunch_out") {
    status = "in_progress";
  } else if (times.length === 2 && workedMinutes > MAX_MINUTES_WITHOUT_LUNCH) {
    status = "incomplete";
    alerts.push({ kind: "missing_lunch" });
  } else {
    status = "complete";
  }

  const forecast =
    expectedMinutes > 0 && status === "in_progress" ? forecastOf(labeled, rules) : {};
  const nextLabel = labelCandidate(punches, { at: truncateToMinute(now) }, now).label;
  const nextAt = forecast[nextLabel];
  const next: NextPunch | null =
    status === "complete"
      ? null
      : nextAt
        ? { label: nextLabel, at: nextAt, minutesUntil: Math.ceil(minutesBetween(now, nextAt)) }
        : { label: nextLabel, at: null, minutesUntil: null };

  const rawBalance = workedMinutes - expectedMinutes;
  const withinTolerance =
    expectedMinutes > 0 && Math.abs(rawBalance) <= rules.dailyToleranceMinutes;
  const closed = status === "complete";
  return {
    status,
    workedMinutes,
    expectedMinutes,
    rawBalance: closed ? rawBalance : null,
    balance: closed ? (withinTolerance ? 0 : rawBalance) : null,
    alerts,
    next,
    forecast,
  };
}

/** Previsões de §7 num dia aberto com jornada: volta = saída almoço + almoço esperado; saída = entrada + jornada + almoço (o real, ou o esperado enquanto não volta). */
function forecastOf(
  labeled: ReturnType<typeof labelDay>,
  rules: DayRules,
): Partial<Record<PunchLabel, Date>> {
  const [entry, lunchOut, lunchReturn] = labeled.map(({ punch }) => punch.punchedAt);
  if (!entry || labeled.length > 3) return {};
  const plus = (instant: Date, minutes: number) =>
    new Date(instant.getTime() + minutes * MINUTE_MS);
  const journeyEnd = plus(entry, rules.dailyMinutes);
  const lunch =
    lunchOut && lunchReturn ? minutesBetween(lunchOut, lunchReturn) : rules.expectedLunchMinutes;
  const forecast: Partial<Record<PunchLabel, Date>> = { exit: plus(journeyEnd, lunch) };
  if (lunchOut && !lunchReturn && lunchOut < journeyEnd) {
    forecast.lunch_return = plus(lunchOut, rules.expectedLunchMinutes);
  }
  return forecast;
}

export type PunchPreview = {
  label: PunchLabel;
  /** Almoço abaixo do esperado com o candidato, e a volta que o completaria. */
  shortLunch: { minutes: number; returnAt: Date } | null;
  /** Saldo do dia quando o candidato o fecha: batida nova, ou a edição da última. */
  dayBalance: number | null;
};

/**
 * Como o candidato entra no seu dia local, entre as batidas recebidas (de qualquer dia).
 * Alimenta o sheet ("Vai entrar como …" e os avisos ao vivo), recalculado a cada mudança.
 */
export function previewPunch(
  punches: DayPunch[],
  candidate: PunchCandidate,
  rules: DayRules,
  now: Date,
): PunchPreview {
  const { day, label } = labelCandidate(punches, candidate, now);
  const summary = summarizeDay(day, toLocalDate(candidate.at), rules, now);

  const lunchOut = labelDay(day, now).find((p) => p.label === "lunch_out")?.punch.punchedAt;
  const short = summary.alerts.find((alert) => alert.kind === "short_lunch");
  const shortLunch =
    short && lunchOut && (label === "lunch_out" || label === "lunch_return")
      ? {
          minutes: short.minutes,
          returnAt: new Date(lunchOut.getTime() + rules.expectedLunchMinutes * MINUTE_MS),
        }
      : null;

  const closesDay = !candidate.editingId || day.every((p) => p.punchedAt <= candidate.at);
  return { label, shortLunch, dayBalance: closesDay ? summary.balance : null };
}
