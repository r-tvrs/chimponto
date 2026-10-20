import type { DayMarkType } from "@chimponto/domain";

/** Nome do tipo do dia nos chips do Dia e nos badges do Período (handoff §5.5 e §6.3). */
export const DAY_MARK_LABELS: Record<DayMarkType, string> = {
  falta: "Falta",
  atestado: "Atestado",
  ferias: "Férias",
  folga_compensada: "Folga",
  abono: "Abono",
  feriado: "Feriado",
};
