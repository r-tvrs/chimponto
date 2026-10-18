import {
  balanceTone,
  type DaySummary,
  formatShortDuration,
  type NextPunch,
  toLocalTime,
} from "@chimponto/domain";
import { useId } from "react";
import { type Humor, Mascote } from "@/components/mascote";
import { Saldo } from "@/components/saldo";
import { PUNCH_LABELS } from "@/punches/punch-labels";

/** Humor da Bolota na Hoje (handoff §1, "Mascote da Hoje"): `offline` sem conexão, senão pelo resumo do dia. */
function humorOf(summary: DaySummary, offline: boolean): Humor {
  if (offline) return "offline";
  switch (summary.status) {
    case "incomplete":
    case "pending":
      return "pendente";
    case "off":
      return "boasvindas";
    case "complete": {
      const tone = balanceTone(summary.balance ?? 0);
      return tone === "positive" ? "feliz" : tone === "negative" ? "preocupado" : "tranquilo";
    }
    case "in_progress":
      switch (summary.next?.label) {
        case "entry":
          return "boasvindas";
        case "lunch_return":
          return "almoco";
        case "exit":
          return summary.next.minutesUntil !== null && summary.next.minutesUntil <= 30
            ? "saida"
            : "tranquilo";
        default:
          return "tranquilo";
      }
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "em 7 min", "agora", "há 2 min". */
function relative(minutesUntil: number): string {
  if (minutesUntil === 0) return "agora";
  const span = formatShortDuration(minutesUntil);
  return minutesUntil > 0 ? `em ${span}` : `há ${span}`;
}

/** Contexto da batida: o almoço esperado para a volta e a saída do almoço; a jornada para a entrada e a saída. */
function contextOf(next: NextPunch, expectedMinutes: number, expectedLunchMinutes: number) {
  if (expectedMinutes === 0) return "dia sem jornada";
  switch (next.label) {
    case "lunch_out":
    case "lunch_return":
      return `almoço de ${formatShortDuration(expectedLunchMinutes)}`;
    case "entry":
    case "exit":
      return `jornada de ${formatShortDuration(expectedMinutes)}`;
    default:
      return null;
  }
}

/** Card "Próximo" da Hoje (handoff §1.3); com o dia fechado, "Dia fechado" e o saldo do dia. */
export function NextCard({
  summary,
  expectedLunchMinutes,
  offline,
}: {
  summary: DaySummary;
  expectedLunchMinutes: number;
  offline: boolean;
}) {
  const eyebrowId = useId();
  const { next } = summary;

  let eyebrow: string;
  let title: React.ReactNode;
  let support: string | null;
  if (!next) {
    eyebrow = "Dia fechado";
    title = (
      <>
        Saldo do dia <Saldo min={summary.balance ?? 0} />
      </>
    );
    support = "Bom descanso. Amanhã tem mais galho.";
  } else {
    const phrase = capitalize(PUNCH_LABELS[next.label].phrase);
    eyebrow = "Próximo";
    title = next.at ? `${phrase} às ${toLocalTime(next.at)}` : phrase;
    const context = contextOf(next, summary.expectedMinutes, expectedLunchMinutes);
    support =
      [next.minutesUntil === null ? null : relative(next.minutesUntil), context]
        .filter(Boolean)
        .join(" · ") || null;
  }

  return (
    <section
      aria-labelledby={eyebrowId}
      className="flex items-center gap-3.5 rounded-[20px] border bg-card p-4"
    >
      <Mascote humor={humorOf(summary, offline)} size={84} />
      <div className="flex min-w-0 flex-col gap-1">
        <span
          id={eyebrowId}
          className="text-[11px] leading-none font-bold tracking-[0.07em] text-muted-foreground uppercase"
        >
          {eyebrow}
        </span>
        <h2 className="text-[19px] leading-[1.2]">{title}</h2>
        {support && (
          <p className="text-[13px] leading-[1.3] font-semibold text-muted-foreground">{support}</p>
        )}
      </div>
    </section>
  );
}
