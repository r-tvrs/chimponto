import { type DaySummary, formatDuration } from "@chimponto/domain";
import { type ReactNode, useId } from "react";
import { Saldo } from "@/components/saldo";

/** Tiles "Trabalhadas" e "Saldo do dia" da tela Dia (handoff §6.5), do resumo do rascunho. */
export function DayTiles({ summary }: { summary: DaySummary }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Tile label="Trabalhadas" value={formatDuration(summary.workedMinutes)} />
      <Tile
        label="Saldo do dia"
        value={summary.balance !== null ? <Saldo min={summary.balance} /> : "—"}
      />
    </div>
  );
}

function Tile({ label, value }: { label: string; value: ReactNode }) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-[5px] rounded-2xl bg-muted px-3.5 py-3"
    >
      <span id={labelId} className="text-xs leading-none font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="text-xl leading-none font-extrabold tabular-nums">{value}</span>
    </div>
  );
}
