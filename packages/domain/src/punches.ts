import { MINUTE_MS, toLocalDate, truncateToMinute } from "./local-time";

// Batidas (docs/02 §2). O rótulo nunca é persistido: sai da ordem cronológica no dia local.

export type PunchLabel =
  "entry" | "lunch_out" | "lunch_return" | "exit" | "extra_out" | "extra_return";

/** O mínimo que as regras precisam de uma batida; o resto viaja junto, sem ser lido. */
export type DayPunch = { id: string; punchedAt: Date };

export type LabeledPunch<P extends DayPunch> = { punch: P; label: PunchLabel };

const POSITION_LABELS: PunchLabel[] = ["entry", "lunch_out", "lunch_return", "exit"];

/** Acima disso, um dia com só 2 batidas é entrada e saída sem almoço (docs/02 §2.1 e §3). */
const MAX_MINUTES_WITHOUT_LUNCH = 360;

function labelAt(position: number): PunchLabel {
  return POSITION_LABELS[position] ?? (position % 2 === 0 ? "extra_out" : "extra_return");
}

/** Batidas de um mesmo dia local, ordenadas por horário e com o rótulo da posição (§2.1). */
export function labelDay<P extends DayPunch>(punches: P[], now: Date): LabeledPunch<P>[] {
  const sorted = [...punches].sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
  const labels = sorted.map((_, i) => labelAt(i));
  if (sorted.length === 2 && isEntryAndExit(sorted[0]!.punchedAt, sorted[1]!.punchedAt, now)) {
    labels[1] = "exit";
  }
  return sorted.map((punch, i) => ({ punch, label: labels[i]! }));
}

function isEntryAndExit(first: Date, second: Date, now: Date): boolean {
  const dayIsPast = toLocalDate(first) < toLocalDate(now);
  const minutesApart = (second.getTime() - first.getTime()) / MINUTE_MS;
  return dayIsPast || minutesApart > MAX_MINUTES_WITHOUT_LUNCH;
}

/** Batida que o usuário está montando: nova, ou a edição da batida `editingId`. */
export type PunchCandidate = { at: Date; editingId?: string | undefined };

export type PunchPreview = { label: PunchLabel };

/**
 * Como o candidato entra no seu dia local, entre as batidas recebidas (de qualquer dia).
 * Alimenta o "Vai entrar como …" do sheet, recalculado a cada mudança de data ou hora.
 */
export function previewPunch(
  punches: DayPunch[],
  candidate: PunchCandidate,
  now: Date,
): PunchPreview {
  const date = toLocalDate(candidate.at);
  const sameDay = othersThan(punches, candidate).filter((p) => toLocalDate(p.punchedAt) === date);
  const self: DayPunch = { id: "", punchedAt: candidate.at };
  const labeled = labelDay([...sameDay, self], now);
  return { label: labeled.find(({ punch }) => punch === self)!.label };
}

/** Já existe outra batida no minuto do candidato? (docs/02 §2: uma batida por minuto.) */
export function isDuplicateMinute(punches: DayPunch[], candidate: PunchCandidate): boolean {
  const minute = truncateToMinute(candidate.at).getTime();
  return othersThan(punches, candidate).some(
    (p) => truncateToMinute(p.punchedAt).getTime() === minute,
  );
}

/** As batidas sem a que o candidato está editando. */
function othersThan<P extends DayPunch>(punches: P[], candidate: PunchCandidate): P[] {
  return punches.filter((p) => p.id !== candidate.editingId);
}

export type PunchSlot<P extends DayPunch> =
  ({ kind: "done" } & LabeledPunch<P>) | { kind: "next" | "future"; label: PunchLabel };

/** `next`: rótulo de uma batida agora (CTA); igual ao do slot "next", que some num dia par de 4+. */
export type DaySlots<P extends DayPunch> = { slots: PunchSlot<P>[]; next: PunchLabel };

/**
 * Os lugares de batida do dia de hoje, para o card Batidas: as feitas, a próxima e as que faltam.
 * São 4, ou o total quando passa de 4 (arredondado para par: 5+ batidas valem se o número for par).
 * A próxima tem o rótulo que uma batida agora teria (o mesmo do CTA e do sheet); as que faltam são
 * os rótulos de um dia completo que nem as feitas nem a próxima cobrem, na ordem do dia. Assim um
 * dia só com entrada e saída mostra o almoço que falta.
 */
export function daySlots<P extends DayPunch>(punches: P[], now: Date): DaySlots<P> {
  const done = labelDay(punches, now);
  const doneSlots = done.map((d) => ({ kind: "done" as const, ...d }));
  const total = Math.max(POSITION_LABELS.length, done.length + (done.length % 2));
  const next = previewPunch(punches, { at: truncateToMinute(now) }, now).label;
  if (done.length === total) return { slots: doneSlots, next };

  const missing = Array.from({ length: total }, (_, i) => labelAt(i));
  for (const label of [...done.map((d) => d.label), next]) {
    const i = missing.indexOf(label);
    if (i >= 0) missing.splice(i, 1);
  }
  const future = missing.slice(0, total - done.length - 1);
  return {
    slots: [
      ...doneSlots,
      { kind: "next", label: next },
      ...future.map((label) => ({ kind: "future" as const, label })),
    ],
    next,
  };
}
