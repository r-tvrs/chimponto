import { addDays, fromLocal, type LocalDate, type LocalTime, toLocalDate } from "@chimponto/domain";

const DATE_TIME = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2})\s*[:;.,]?\s*(\d{2})/;
const MAX_DAYS_AGO = 60;

/**
 * Data e hora da batida no texto lido do comprovante do REP (docs/06): a linha do `PIS` primeiro,
 * o texto inteiro se ela não tiver. Null se não achar ou se for inválida, futura ou de mais de 60
 * dias atrás.
 */
export function parseReceipt(
  text: string,
  now: Date,
): { date: LocalDate; time: LocalTime } | null {
  const pisLine = text.split("\n").find((line) => line.includes("PIS"));
  const match = (pisLine && DATE_TIME.exec(pisLine)) || DATE_TIME.exec(text);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  const at = fromLocal(date, time);
  if (!at || at > now || date < addDays(toLocalDate(now), -MAX_DAYS_AGO)) return null;
  return { date, time };
}
