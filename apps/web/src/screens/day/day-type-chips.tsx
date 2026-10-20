import { DAY_MARK_TYPES, type DayMarkType } from "@chimponto/domain";
import { DAY_MARK_LABELS } from "@/punches/day-mark-labels";
import { cn } from "@/lib/utils";

const NOTES: Record<"falta" | "feriado" | "abonado", string> = {
  falta: "Falta sem abono desconta o dia e o DSR da semana.",
  feriado: "Feriado: não conta jornada.",
  abonado: "Dia abonado: não conta jornada.",
};

/**
 * Tipo do dia na tela Dia (handoff §6.3, com "Feriado" marcado à mão: docs/07): chips de 38 px,
 * com a nota do tipo escolhido. `null` é Normal.
 */
export function DayTypeChips({
  value,
  onChange,
}: {
  value: DayMarkType | null;
  onChange: (value: DayMarkType | null) => void;
}) {
  const options = [null, ...DAY_MARK_TYPES];
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Tipo do dia" className="flex flex-wrap gap-2">
        {options.map((type) => (
          <button
            key={type ?? "normal"}
            type="button"
            aria-pressed={value === type}
            onClick={() => onChange(type)}
            className={cn(
              "h-[38px] rounded-full px-3.5 text-[13px] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
              value === type ? "bg-foreground text-background" : "bg-muted text-foreground",
            )}
          >
            {type ? DAY_MARK_LABELS[type] : "Normal"}
          </button>
        ))}
      </div>
      {value && (
        <p className="text-[12.5px] leading-[1.4] font-semibold text-muted-foreground">
          {NOTES[value === "falta" || value === "feriado" ? value : "abonado"]}
        </p>
      )}
    </div>
  );
}
