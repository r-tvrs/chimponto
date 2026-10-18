import { formatDayMonth, type Period, type PeriodTiming } from "@chimponto/domain";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Seletor do período (handoff §5.2): o próximo fica desabilitado enquanto não começa. */
export function PeriodSelector({
  period,
  timing,
  onPrevious,
  onNext,
}: {
  period: Period;
  timing: PeriodTiming;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Período"
      className="flex items-center gap-1 rounded-2xl bg-muted p-1"
    >
      <StepButton label="Período anterior" onClick={onPrevious}>
        <ChevronLeft />
      </StepButton>
      <div className="flex flex-1 flex-col items-center gap-[3px]">
        <span className="text-[15px] leading-none font-extrabold tabular-nums">
          {formatDayMonth(period.start)} → {formatDayMonth(period.end)}
        </span>
        <span className="text-[11.5px] leading-none font-semibold text-muted-foreground">
          {timingText(period, timing)}
        </span>
      </div>
      <StepButton label="Próximo período" onClick={onNext} disabled={timing.kind !== "past"}>
        <ChevronRight />
      </StepButton>
    </div>
  );
}

function timingText(period: Period, timing: PeriodTiming): string {
  switch (timing.kind) {
    case "current": {
      const { daysUntilClose: n } = timing;
      const close = n === 0 ? "fecha hoje" : n === 1 ? "fecha amanhã" : `fecha em ${n} dias`;
      return `período atual · ${close}`;
    }
    case "past":
      return `período fechado · pagamento em ${formatDayMonth(period.payDate)}`;
    case "future":
      return `começa em ${formatDayMonth(period.start)}`;
  }
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:text-muted-foreground disabled:opacity-45 [&_svg]:size-5"
    >
      {children}
    </button>
  );
}
