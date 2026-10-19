import type { DraftRow, LocalTime } from "@chimponto/domain";
import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { PUNCH_LABELS } from "@/punches/punch-labels";

/** Linha do rascunho na tela: `time` vazio é uma linha ainda sem hora. */
export type DraftRowValue = { id: string; time: LocalTime | "" };

/**
 * Card Batidas da tela Dia (handoff §6.4): uma linha de 56 px por batida, com o rótulo derivado
 * ao vivo, a hora editável e o botão de remover; "Adicionar batida" abre uma linha vazia no fim.
 */
export function DayPunchesCard({
  rows,
  onChange,
  onRemove,
  onAdd,
}: {
  rows: (DraftRowValue & DraftRow)[];
  onChange: (id: string, time: LocalTime | "") => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}) {
  const titleId = useId();
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-col rounded-[20px] border bg-card px-3.5 py-1.5"
    >
      <h2 id={titleId} className="sr-only">
        Batidas
      </h2>
      {rows.map((row) => {
        const label = PUNCH_LABELS[row.label].short;
        return (
          <div key={row.id} className="flex flex-col justify-center border-b py-1.5">
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-3">
                <span className="flex-1 text-[15px] font-semibold">{label}</span>
                <input
                  type="time"
                  aria-label={label}
                  aria-invalid={row.duplicate || undefined}
                  aria-describedby={row.duplicate ? `${row.id}-error` : undefined}
                  value={row.time}
                  onChange={(e) => onChange(row.id, e.target.value)}
                  className="h-11 w-[118px] rounded-xl border border-input bg-background px-2.5 text-[17px] font-extrabold tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-negative"
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover ${label}`}
                onClick={() => onRemove(row.id)}
                className="-mr-2 text-muted-foreground"
              >
                <Trash2 />
              </Button>
            </div>
            {row.duplicate && (
              <p
                id={`${row.id}-error`}
                className="pb-1 text-[12.5px] leading-[1.4] font-bold text-negative"
              >
                Já tem uma batida às {row.time}.
              </p>
            )}
          </div>
        );
      })}
      <Button type="button" variant="ghost" onClick={onAdd} className="my-1.5 self-start">
        <Plus aria-hidden />
        Adicionar batida
      </Button>
    </div>
  );
}
