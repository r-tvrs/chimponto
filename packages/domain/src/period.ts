import type { CompanyRules } from "./company-rules";
import { addDays, type LocalDate } from "./local-time";

// Período de apuração (docs/02 §5): do dia seguinte ao fechamento anterior até `closingDay` do mês M,
// pago em `payday` do mês M+1.

export type PeriodRules = Pick<CompanyRules, "closingDay" | "payday">;

/** Datas de calendário, `end` inclusive. */
export type Period = { start: LocalDate; end: LocalDate; payDate: LocalDate };

/** Dia `day` do mês `month` (0 = janeiro; fora de 0–11 vira o ano). */
function dayOf(year: number, month: number, day: number): LocalDate {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** O período que contém `date`. */
export function periodContaining(date: LocalDate, rules: PeriodRules): Period {
  const [y, m, d] = date.split("-").map(Number);
  // Mês M do fechamento: o da data até o `closingDay`, o seguinte depois dele.
  const month = m! - 1 + (d! > rules.closingDay ? 1 : 0);
  return {
    // O dia seguinte ao fechamento anterior: com `closingDay` 28, março começa no dia 1º.
    start: addDays(dayOf(y!, month - 1, rules.closingDay), 1),
    end: dayOf(y!, month, rules.closingDay),
    payDate: dayOf(y!, month + 1, rules.payday),
  };
}

export function previousPeriod(period: Period, rules: PeriodRules): Period {
  return periodContaining(addDays(period.start, -1), rules);
}

export function nextPeriod(period: Period, rules: PeriodRules): Period {
  return periodContaining(addDays(period.end, 1), rules);
}

/** Onde o período está em relação a `today`; o atual diz quantos dias faltam para o fechamento. */
export type PeriodTiming =
  { kind: "current"; daysUntilClose: number } | { kind: "past" } | { kind: "future" };

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: LocalDate, to: LocalDate) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

export function periodTiming(period: Period, today: LocalDate): PeriodTiming {
  if (today > period.end) return { kind: "past" };
  if (today < period.start) return { kind: "future" };
  return { kind: "current", daysUntilClose: daysBetween(today, period.end) };
}
