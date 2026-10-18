import {
  type CompanyRules,
  formatDayMonth,
  periodContaining,
  toLocalDate,
} from "@chimponto/domain";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { Saldo } from "@/components/saldo";
import { usePeriodSummary } from "@/screens/period/use-period-summary";

/** Tile do período na Hoje (handoff §1.7): o saldo do período atual, que leva ao Período. */
export function PeriodTile({ rules, now }: { rules: CompanyRules; now: Date }) {
  const period = periodContaining(toLocalDate(now), rules);
  const summary = usePeriodSummary(period, rules, now);
  const label = `Saldo do período · ${formatDayMonth(period.start)} – ${formatDayMonth(period.end)}`;
  return (
    <Link
      to="/periodo"
      className="flex min-h-16 items-center gap-3 rounded-[18px] border bg-card py-3.5 pr-3.5 pl-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
    >
      <span className="flex flex-1 flex-col gap-[5px]">
        <span className="text-[12.5px] leading-none font-semibold text-muted-foreground">
          {label}
        </span>
        {summary.data ? (
          <Saldo min={summary.data.netBalance} className="text-[22px] leading-none" />
        ) : (
          <span className="text-[22px] leading-none font-extrabold text-muted-foreground">—</span>
        )}
      </span>
      <ChevronRight className="size-5 text-muted-foreground" />
    </Link>
  );
}
