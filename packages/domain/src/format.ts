// Formatação de durações, saldos e datas (docs/07: saldo sempre com sinal + cor).

export type BalanceTone = "positive" | "negative" | "neutral";

/** 266 -> "4h26". Ignora o sinal. */
export function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  return `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}`;
}

const DURATION_PATTERN = /^(\d{1,2})(?:[h:](\d{2})?)?$/i;

/** Inverso de `formatDuration`: "8h48" -> 528. Aceita também "8:48", "8h" e "8". Inválido -> null. */
export function parseDuration(text: string): number | null {
  const match = DURATION_PATTERN.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return minutes < 60 ? hours * 60 + minutes : null;
}

/** Sempre com sinal; o menos é U+2212. 80 -> "+1h20", -35 -> "−0h35", 0 -> "±0h00". */
export function formatBalance(minutes: number): string {
  const sign = minutes > 0 ? "+" : minutes < 0 ? "−" : "±";
  return sign + formatDuration(minutes);
}

export function balanceTone(minutes: number): BalanceTone {
  return minutes > 0 ? "positive" : minutes < 0 ? "negative" : "neutral";
}

/** Texto para leitores de tela: 80 -> "mais 1 hora e 20 minutos". */
export function spokenBalance(minutes: number): string {
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const prefix = minutes > 0 ? "mais " : minutes < 0 ? "menos " : "";
  return `${prefix}${hours} hora${hours === 1 ? "" : "s"} e ${mins} minuto${mins === 1 ? "" : "s"}`;
}

const longDateFormat = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "numeric",
  month: "long",
});

/** Data local de São Paulo para cabeçalhos: "sex, 16 de outubro" (sem o ponto de "sex."). */
export function formatLongDate(instant: Date): string {
  const parts = longDateFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("weekday").replace(".", "")}, ${part("day")} de ${part("month")}`;
}
