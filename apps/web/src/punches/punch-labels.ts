import type { PunchLabel } from "@chimponto/domain";

// Textos de cada rótulo derivado pelo domínio (handoff, seções 1 e 2).

type LabelText = {
  /** Linha do card Batidas: "Volta almoço". */
  short: string;
  /** Frase, em minúsculas: "Vai entrar como volta do almoço", subtítulo do CTA. */
  phrase: string;
  /** Toast ao salvar uma batida às `time`. */
  toast: (time: string) => string;
};

export const PUNCH_LABELS: Record<PunchLabel, LabelText> = {
  entry: {
    short: "Entrada",
    phrase: "entrada",
    toast: (time) => `Bom dia! Entrada às ${time}.`,
  },
  lunch_out: {
    short: "Saída almoço",
    phrase: "saída para o almoço",
    toast: (time) => `Bom almoço! Saída às ${time}.`,
  },
  lunch_return: {
    short: "Volta almoço",
    phrase: "volta do almoço",
    toast: (time) => `De volta ao galho! Volta às ${time}.`,
  },
  exit: {
    short: "Saída",
    phrase: "saída",
    toast: (time) => `Até amanhã! Saída às ${time}.`,
  },
  extra_out: {
    short: "Saída extra",
    phrase: "saída extra",
    toast: (time) => `Saída extra às ${time}.`,
  },
  extra_return: {
    short: "Retorno extra",
    phrase: "retorno extra",
    toast: (time) => `De volta ao galho! Retorno às ${time}.`,
  },
};
