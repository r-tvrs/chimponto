import type { DaySummary } from "@chimponto/domain";
import { CircleCheck, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUNCH_LABELS } from "@/punches/punch-labels";

/**
 * CTA fixo da Hoje, na metade de baixo sobre um degradê do fundo (handoff §1.8). Com o dia
 * fechado, vira "Dia completo · N de N batidas", ainda clicável para mais batidas (ir ao médico e
 * voltar); o rótulo delas sai da hora, no sheet. Sem resumo (carregando), desabilitado.
 */
export function PunchCta({
  summary,
  done,
  total,
  onPunch,
}: {
  summary: DaySummary | null;
  done: number;
  total: number;
  onPunch: () => void;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto bg-linear-to-t from-background from-72% to-transparent px-4 pt-[18px] pb-3">
      {summary?.next !== null ? (
        <Button
          size="ponto"
          disabled={!summary}
          onClick={onPunch}
          className="shadow-[inset_0_-3px_0_color-mix(in_oklab,var(--primary)_70%,var(--foreground)),0_8px_20px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
        >
          <Fingerprint aria-hidden />
          <span className="flex flex-col items-start gap-0.5">
            <span className="leading-none">Bater ponto</span>
            {summary && (
              <span className="text-xs leading-none font-bold opacity-80">
                {PUNCH_LABELS[summary.next.label].phrase}
              </span>
            )}
          </span>
        </Button>
      ) : (
        <Button
          size="ponto"
          onClick={onPunch}
          className="bg-muted text-[15px] text-muted-foreground shadow-none"
        >
          <CircleCheck aria-hidden />
          <span className="flex flex-col items-start gap-0.5">
            <span className="leading-none">
              Dia completo · {done} de {total} batidas
            </span>
            <span className="text-xs leading-none font-bold opacity-80">registrar nova batida</span>
          </span>
        </Button>
      )}
    </div>
  );
}
