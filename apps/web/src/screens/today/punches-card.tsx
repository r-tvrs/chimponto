import { type DaySummary, type PunchSlot, toLocalTime } from "@chimponto/domain";
import { Check, Pencil } from "lucide-react";
import { CachoBanana } from "@/components/cacho-banana";
import { cn } from "@/lib/utils";
import { PUNCH_LABELS } from "@/punches/punch-labels";
import type { Punch } from "@/punches/punches";

type Row = PunchSlot<Punch>;

/**
 * Card "Batidas" da Hoje (handoff §1.5). Feita abre a edição; as outras, a próxima batida. As que
 * faltam mostram a hora prevista ("prev."), quando há.
 */
export function PunchesCard({
  slots,
  forecast,
  onEdit,
  onPunch,
}: {
  slots: Row[];
  forecast: DaySummary["forecast"];
  onEdit: (punch: Punch) => void;
  onPunch: () => void;
}) {
  const done = slots.filter((slot) => slot.kind === "done").length;
  return (
    <section
      aria-labelledby="punches-title"
      className="flex flex-col rounded-[20px] border bg-card px-1.5 pt-1.5 pb-2"
    >
      <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-1.5">
        <h2 id="punches-title" className="flex-1 text-[17px] leading-none">
          Batidas
        </h2>
        <span className="text-[12.5px] leading-none font-bold text-muted-foreground tabular-nums">
          {done} de {slots.length}
        </span>
        <span aria-hidden className="flex text-muted-foreground">
          <CachoBanana n={Math.min(done, 4)} />
        </span>
      </div>
      {slots.map((row, i) => (
        <PunchRow
          key={row.kind === "done" ? row.punch.id : i}
          row={row}
          forecast={row.kind === "done" ? undefined : forecast[row.label]}
          onEdit={onEdit}
          onPunch={onPunch}
        />
      ))}
    </section>
  );
}

function PunchRow({
  row,
  forecast,
  onEdit,
  onPunch,
}: {
  row: Row;
  forecast: Date | undefined;
  onEdit: (punch: Punch) => void;
  onPunch: () => void;
}) {
  const label = PUNCH_LABELS[row.label].short;
  const time = row.kind === "done" ? toLocalTime(row.punch.punchedAt) : null;
  return (
    <button
      type="button"
      aria-label={time ? `Editar ${label}, ${time}` : `Bater ${label}`}
      onClick={() => (row.kind === "done" ? onEdit(row.punch) : onPunch())}
      className={cn(
        "grid min-h-[52px] grid-cols-[22px_minmax(0,1fr)_auto_20px] items-center gap-3 rounded-[14px] px-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        row.kind === "next" && "bg-[color-mix(in_oklab,var(--primary)_18%,var(--card))]",
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center justify-self-center rounded-full border-2",
          row.kind === "done" && "border-foreground bg-foreground text-card",
          row.kind === "next" && "border-foreground bg-primary",
          row.kind === "future" && "border-input",
        )}
      >
        {row.kind === "done" && <Check className="size-3" strokeWidth={3} aria-hidden />}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "text-[15px] leading-[1.2]",
            row.kind === "next" ? "font-extrabold" : "font-semibold",
          )}
        >
          {label}
        </span>
        {row.kind === "next" && (
          <span className="text-[11.5px] leading-none font-bold text-muted-foreground">
            próxima batida
          </span>
        )}
      </span>
      <span
        className={cn(
          "text-lg leading-none font-extrabold tabular-nums",
          !time && "text-muted-foreground",
        )}
      >
        {time ??
          (forecast ? (
            <>
              <span className="text-[11.5px] font-semibold">prev.</span> {toLocalTime(forecast)}
            </>
          ) : (
            "—"
          ))}
      </span>
      <Pencil className={cn("size-4 text-muted-foreground", !time && "invisible")} aria-hidden />
    </button>
  );
}
