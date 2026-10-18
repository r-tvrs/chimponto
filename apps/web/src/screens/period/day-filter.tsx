export type DayFilterValue = "all" | "unresolved";

/** Filtro segmentado da lista (handoff §5.4). */
export function DayFilter({
  value,
  unresolved,
  onChange,
}: {
  value: DayFilterValue;
  unresolved: number;
  onChange: (value: DayFilterValue) => void;
}) {
  const options: [DayFilterValue, string][] = [
    ["all", "Todos os dias"],
    ["unresolved", `Pendências (${unresolved})`],
  ];
  return (
    <div
      role="tablist"
      aria-label="Filtro dos dias"
      className="grid grid-cols-2 rounded-[14px] bg-muted p-1"
    >
      {options.map(([option, label]) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={
              selected
                ? "h-10 rounded-[11px] bg-card text-[13.5px] font-bold text-foreground shadow-[0_1px_3px_rgba(0,0,0,.12)]"
                : "h-10 rounded-[11px] text-[13.5px] font-bold text-muted-foreground"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
