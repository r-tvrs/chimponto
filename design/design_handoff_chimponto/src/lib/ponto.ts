// Regras de cálculo usadas no protótipo. Tudo em minutos desde 00:00.
export const JORNADA_MIN = 528; // 8h48
export const ALMOCO_MIN = 60;   // mínimo CLT para jornada > 6h
export const LEMBRETE_ANTES_MIN = 10;

export type Hora = string | null; // "HH:MM"
export type Batidas = [Hora, Hora, Hora, Hora]; // entrada, saída almoço, volta almoço, saída
export const ROTULOS = ["Entrada", "Saída almoço", "Volta almoço", "Saída"] as const;
export const ROTULOS_LONGOS = ["Entrada", "Saída para o almoço", "Volta do almoço", "Saída"] as const;

export type TipoDia = "normal" | "falta" | "atestado" | "ferias" | "folga" | "abono" | "feriado";

export const toMin = (t: Hora): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (m: number): string => {
  const x = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
/** 266 -> "4h26" */
export const hm = (min: number): string => {
  const a = Math.abs(min);
  return `${Math.floor(a / 60)}h${String(a % 60).padStart(2, "0")}`;
};
/** Sempre com sinal. Menos é U+2212. 80 -> "+1h20", -35 -> "−0h35", 0 -> "±0h00" */
export const saldoTexto = (min: number): string => (min > 0 ? "+" : min < 0 ? "\u2212" : "±") + hm(min);
export const saldoTom = (min: number) => (min > 0 ? "positive" : min < 0 ? "negative" : "neutral") as "positive" | "negative" | "neutral";
/** Para leitores de tela: "mais 1 hora e 20 minutos" */
export const saldoFalado = (min: number): string => {
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  const s = min > 0 ? "mais " : min < 0 ? "menos " : "";
  return `${s}${h} hora${h === 1 ? "" : "s"} e ${m} minuto${m === 1 ? "" : "s"}`;
};

export interface Alerta { tipo: "warning" | "pending"; titulo: string; detalhe: string }

export function calcularDia(b: Batidas, tipo: TipoDia = "normal", opts: { passado?: boolean; agora?: number } = {}) {
  const M = b.map(toMin);
  const n = M.filter((x) => x != null).length;
  let trabalhadas: number | null = null;
  if (M[0] != null && M[1] != null) {
    trabalhadas = M[1] - M[0];
    if (M[2] != null) trabalhadas += (M[3] ?? opts.agora ?? M[2]) - M[2];
  } else if (M[0] != null && opts.agora != null) trabalhadas = opts.agora - M[0];
  const almoco = M[1] != null && M[2] != null ? M[2] - M[1] : null;
  let saldo: number | null = null;
  const alertas: Alerta[] = [];
  if (tipo === "normal") {
    if (n === 4 && trabalhadas != null) saldo = trabalhadas - JORNADA_MIN;
    if (almoco != null && almoco < ALMOCO_MIN)
      alertas.push({ tipo: "warning", titulo: `Almoço de ${almoco} min`, detalhe: "O mínimo é 1h para jornada acima de 6h (CLT)." });
    if (opts.passado && n > 0 && n < 4)
      alertas.push({ tipo: "warning", titulo: `${n} de 4 batidas`, detalhe: `Falta ${["a entrada", "a saída do almoço", "a volta do almoço", "a saída"][M.findIndex((x) => x == null)]}.` });
    if (opts.passado && n === 0)
      alertas.push({ tipo: "pending", titulo: "Dia sem registro", detalhe: "Adicione as batidas ou marque o tipo do dia." });
  } else if (tipo === "falta") saldo = -JORNADA_MIN;
  else if (tipo !== "feriado") saldo = 0; // abonado: conta como jornada cheia
  return { n, trabalhadas, almoco, saldo, alertas };
}

/** Horários previstos de cada batida, a partir do que já foi batido. */
export function previstos(b: Batidas): [number, number, number, number] {
  const M = b.map(toMin);
  const e = M[0] ?? 540;
  const sa = M[1] ?? e + 240;
  const almoco = M[1] != null && M[2] != null ? M[2] - M[1] : ALMOCO_MIN;
  return [540, sa, sa + ALMOCO_MIN, e + JORNADA_MIN + almoco];
}

/** Próxima batida pendente (0–3) ou 4 quando o dia está completo. */
export const proximaBatida = (b: Batidas) => b.findIndex((x) => !x) === -1 ? 4 : b.findIndex((x) => !x);

/** Período de apuração: dia 20 de um mês até dia 19 do seguinte. */
export function periodoDe(data: Date) {
  const y = data.getFullYear(), m = data.getMonth();
  const inicio = data.getDate() >= 20 ? new Date(y, m, 20) : new Date(y, m - 1, 20);
  const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 19);
  const pagamento = new Date(fim.getFullYear(), fim.getMonth() + 1, 1);
  return { inicio, fim, pagamento };
}
