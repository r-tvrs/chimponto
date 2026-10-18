import { type DaySummary, formatDuration } from "@chimponto/domain";
import { type ReactNode, useId } from "react";
import { Saldo } from "@/components/saldo";

/** Tiles "Trabalhadas" e "Saldo do dia" da Hoje (handoff §1.6), com a jornada da empresa. */
export function DayTiles({ summary }: { summary: DaySummary }) {
  const { status, workedMinutes, expectedMinutes, balance } = summary;
  const journey = expectedMinutes > 0 ? formatDuration(expectedMinutes) : null;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Tile
        label="Trabalhadas"
        value={formatDuration(workedMinutes)}
        support={journey ? `de ${journey}` : "sem jornada"}
      />
      {status === "complete" && balance !== null ? (
        <Tile
          label="Saldo do dia"
          value={<Saldo min={balance} />}
          support={journey ? `jornada ${journey}` : "sem jornada"}
        />
      ) : (
        <Tile
          label="Saldo do dia"
          value="—"
          support={status === "incomplete" ? "dia incompleto" : "fecha na saída"}
        />
      )}
    </div>
  );
}

function Tile({ label, value, support }: { label: string; value: ReactNode; support: string }) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-1.5 rounded-[18px] border bg-card p-3.5"
    >
      <span id={labelId} className="text-[12.5px] leading-none font-bold text-muted-foreground">
        {label}
      </span>
      <span className="text-[26px] leading-none font-extrabold tabular-nums">{value}</span>
      <span className="text-xs leading-none font-semibold text-muted-foreground">{support}</span>
    </div>
  );
}
