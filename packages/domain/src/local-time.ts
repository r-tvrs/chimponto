import { WEEKDAYS, type Weekday } from "./company-rules";

// Tempo local de São Paulo (docs/02 §2). Única forma de obter o "dia" de uma batida no cliente;
// equivale à coluna `local_date` de `punches` ((punched_at at time zone 'America/Sao_Paulo')::date).

export const TIME_ZONE = "America/Sao_Paulo";

/** Data de calendário "AAAA-MM-DD". */
export type LocalDate = string;
/** Hora local "HH:MM". */
export type LocalTime = string;

export const MINUTE_MS = 60_000;

const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function localParts(instant: Date) {
  const parts = partsFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function toLocalDate(instant: Date): LocalDate {
  return localParts(instant).date;
}

export function toLocalTime(instant: Date): LocalTime {
  return localParts(instant).time;
}

export function truncateToMinute(instant: Date): Date {
  return new Date(Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Instante de uma data e hora locais de São Paulo; null se alguma for inválida. */
export function fromLocal(date: LocalDate, time: LocalTime): Date | null {
  const d = DATE_PATTERN.exec(date);
  const t = TIME_PATTERN.exec(time);
  if (!d || !t) return null;
  const asUtc = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  // Corrige pelo deslocamento do fuso naquele instante (estável mesmo se voltar o horário de verão).
  let instant = asUtc;
  for (let i = 0; i < 2; i++) instant = asUtc - offsetMs(new Date(instant));
  const result = new Date(instant);
  const back = localParts(result);
  return back.date === date && back.time === time ? result : null;
}

/** Quanto o horário local de São Paulo está à frente do UTC (negativo: UTC−3 = −3h). */
function offsetMs(instant: Date): number {
  const { date, time } = localParts(instant);
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return Date.UTC(y!, m! - 1, d!, h!, min!) - truncateToMinute(instant).getTime();
}

/** A data `days` dias depois (antes, se negativo) de `date`. */
export function addDays(date: LocalDate, days: number): LocalDate {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
}

export function weekdayOf(date: LocalDate): Weekday {
  // Meio-dia UTC cai no mesmo dia do calendário em qualquer fuso do Brasil.
  const sundayFirst = new Date(`${date}T12:00:00Z`).getUTCDay();
  return WEEKDAYS[(sundayFirst + 6) % 7]!;
}
