import type { OvertimeKind, PeriodSummary } from "@chimponto/domain";
import { Fragment, type ReactNode, useId } from "react";
import { Mascote } from "@/components/mascote";
import { Saldo } from "@/components/saldo";

const KIND_LABEL: Record<OvertimeKind, string> = {
  weekday: "Dia útil",
  saturday: "Sábado",
  sundayHoliday: "Domingo/feriado",
};

/** Resumo do período (handoff §5.3), com as horas extras separadas por tipo (docs/02 §6). */
export function SummaryCard({ summary }: { summary: PeriodSummary }) {
  const titleId = useId();
  const { netBalance, overtimeMinutes, deficitMinutes, pendingDays, incompleteDays } = summary;
  const overtime = Object.values(overtimeMinutes).reduce((sum, minutes) => sum + minutes, 0);
  const kinds = (Object.keys(KIND_LABEL) as OvertimeKind[]).filter((k) => overtimeMinutes[k] > 0);
  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3.5 rounded-[20px] border bg-card px-4 pt-[18px] pb-4"
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span
            id={titleId}
            className="text-[12.5px] leading-none font-semibold text-muted-foreground"
          >
            Saldo do período
          </span>
          <Saldo min={netBalance} className="text-[40px] leading-none tracking-[-0.02em]" />
        </div>
        <Mascote
          humor={netBalance > 0 ? "feliz" : netBalance < 0 ? "preocupado" : "tranquilo"}
          size={64}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniTile label="Horas extras">
          <Saldo min={overtime} />
        </MiniTile>
        <MiniTile label="Débito">
          <Saldo min={-deficitMinutes} />
        </MiniTile>
        <MiniTile label="Pendências">
          <span className="text-warning">{pendingDays + incompleteDays}</span>
        </MiniTile>
      </div>
      {kinds.length > 0 && (
        <p className="text-[12.5px] leading-[1.3] font-semibold text-muted-foreground">
          {kinds.map((kind, i) => (
            <Fragment key={kind}>
              {i > 0 && " · "}
              {KIND_LABEL[kind]} <Saldo min={overtimeMinutes[kind]} />
            </Fragment>
          ))}
        </p>
      )}
    </section>
  );
}

function MiniTile({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId();
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-[5px] rounded-xl bg-muted p-2.5"
    >
      <span
        id={labelId}
        className="text-[11.5px] leading-[1.1] font-semibold text-muted-foreground"
      >
        {label}
      </span>
      <span className="text-base leading-none font-extrabold tabular-nums">{children}</span>
    </div>
  );
}
