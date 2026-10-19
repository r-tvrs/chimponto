import {
  formatDayMonth,
  formatDuration,
  formatMonth,
  formatPunchCount,
  formatWeekday,
  type LocalDate,
  type PeriodDay,
} from "@chimponto/domain";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Saldo } from "@/components/saldo";
import { Badge } from "@/components/ui/badge";
import { DAY_MARK_LABELS } from "@/punches/day-mark-labels";
import { cn } from "@/lib/utils";

/**
 * Lista dos dias do período (handoff §5.5), do mais recente, com cabeçalho por mês.
 * Hoje leva à Hoje e os dias passados abrem a tela Dia; os futuros não são tocáveis.
 */
export function DayList({ days, today }: { days: PeriodDay[]; today: LocalDate }) {
  const newestFirst = [...days].reverse();
  return (
    <ul aria-label="Dias do período" className="overflow-hidden rounded-[20px] border bg-card">
      {newestFirst.map((day, i) => {
        const month = day.date.slice(0, 7);
        const firstOfMonth = newestFirst[i - 1]?.date.slice(0, 7) !== month;
        return (
          <DayRow key={day.date} day={day} today={today}>
            {firstOfMonth && (
              <h2 className="bg-muted px-4 pt-3 pb-2 font-sans text-[11px] leading-none font-bold tracking-[0.08em] text-muted-foreground uppercase">
                {formatMonth(day.date)}
              </h2>
            )}
          </DayRow>
        );
      })}
    </ul>
  );
}

/** A linha do dia, com o cabeçalho do mês antes dela quando é a primeira do mês. */
function DayRow({
  day,
  today,
  children,
}: {
  day: PeriodDay;
  today: LocalDate;
  children: ReactNode;
}) {
  const isToday = day.date === today;
  const target = isToday ? "/" : day.date < today ? `/periodo/${day.date}` : null;
  const label = `${formatWeekday(day.date)}, ${formatDayMonth(day.date)}`;
  const badge = badgeOf(day, isToday);
  const balance = day.status === "complete" ? day.summary.balance : null;
  const content = (
    <>
      <span className="flex flex-col items-center gap-[3px]">
        <span className="text-[10.5px] leading-none font-bold tracking-[0.06em] text-muted-foreground uppercase">
          {formatWeekday(day.date)}
        </span>
        <span className="text-[19px] leading-none font-extrabold tabular-nums">
          {Number(day.date.slice(8, 10))}
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-start gap-[5px]">
        <span className="text-sm leading-[1.2] font-semibold tabular-nums">
          {workedText(day, isToday)}
        </span>
        {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
      </span>
      {balance !== null ? (
        <Saldo min={balance} className="text-[15px] leading-none" />
      ) : (
        <span className="text-[15px] leading-none font-extrabold text-muted-foreground">—</span>
      )}
      <span className="flex text-muted-foreground [&_svg]:size-4">
        {target && <ChevronRight />}
      </span>
    </>
  );
  const rowClass =
    "grid min-h-[62px] w-full grid-cols-[40px_minmax(0,1fr)_auto_16px] items-center gap-3 border-t py-2.5 pr-3 pl-3.5";
  return (
    <>
      {children && <li role="presentation">{children}</li>}
      <li aria-label={label} className={cn(day.status === "future" && "opacity-55")}>
        {target ? (
          <Link
            to={target}
            aria-label={isToday ? `${label}, abrir Hoje` : `${label}, abrir o dia`}
            className={cn(
              rowClass,
              isToday && "bg-primary/12",
              "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
            )}
          >
            {content}
          </Link>
        ) : (
          <div className={rowClass}>{content}</div>
        )}
      </li>
    </>
  );
}

function workedText(day: PeriodDay, isToday: boolean): string {
  switch (day.status) {
    case "future":
      return "ainda não chegou";
    case "in_progress":
      return isToday ? "em andamento" : formatDuration(day.summary.workedMinutes);
    case "incomplete":
      return "incompleto";
    case "pending":
      return "—";
    case "off":
      return day.mark ? "—" : "sem jornada";
    case "complete":
      return formatDuration(day.summary.workedMinutes);
  }
}

type DayBadge = { variant: "today" | "pending" | "warning" | "negative" | "neutral"; text: string };

/** Um badge por dia, do mais importante: hoje, sem registro, incompleto, tipo do dia, almoço curto. */
function badgeOf(day: PeriodDay, isToday: boolean): DayBadge | null {
  if (isToday) return { variant: "today", text: "Hoje" };
  if (day.status === "pending") return { variant: "pending", text: "Sem registro" };
  const kinds = day.summary.alerts.map((alert) => alert.kind);
  if (kinds.includes("odd_punches"))
    return { variant: "warning", text: formatPunchCount(day.punchCount) };
  if (kinds.includes("missing_lunch")) return { variant: "warning", text: "Sem almoço" };
  if (day.mark) {
    return {
      variant: day.mark === "falta" ? "negative" : "neutral",
      text: DAY_MARK_LABELS[day.mark],
    };
  }
  if (kinds.includes("short_lunch")) return { variant: "warning", text: "Almoço curto" };
  return null;
}
