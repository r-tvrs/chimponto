import {
  type CompanyRules,
  nextPeriod,
  type Period,
  periodContaining,
  periodTiming,
  previousPeriod,
  toLocalDate,
} from "@chimponto/domain";
import { useState } from "react";
import { useCompanyRules } from "@/company/company";
import { ErrorState } from "@/components/error-state";
import { ScreenHeader } from "@/components/screen-header";
import { useNow } from "@/lib/use-now";
import { DayFilter, type DayFilterValue } from "./period/day-filter";
import { DayList } from "./period/day-list";
import { PeriodSelector } from "./period/period-selector";
import { SummaryCard } from "./period/summary-card";
import { usePeriodSummary } from "./period/use-period-summary";

export function PeriodScreen() {
  const rules = useCompanyRules();
  return (
    <>
      <ScreenHeader title="Período" />
      {rules && <PeriodContent rules={rules} />}
    </>
  );
}

function PeriodContent({ rules }: { rules: CompanyRules }) {
  const now = useNow();
  const today = toLocalDate(now);
  // null: o período atual, que acompanha a virada do dia.
  const [chosen, setChosen] = useState<Period | null>(null);
  const [filter, setFilter] = useState<DayFilterValue>("all");
  const period = chosen ?? periodContaining(today, rules);
  const timing = periodTiming(period, today);
  const summary = usePeriodSummary(period, rules, now);

  if (summary.isError) {
    return (
      <ErrorState
        inShell
        title="Não deu para abrir o período"
        message="Confira a conexão e tente de novo."
        onRetry={() => void summary.refetch()}
      />
    );
  }

  return (
    <>
      <PeriodSelector
        period={period}
        timing={timing}
        onPrevious={() => setChosen(previousPeriod(period, rules))}
        onNext={() => {
          const next = nextPeriod(period, rules);
          setChosen(periodTiming(next, today).kind === "current" ? null : next);
        }}
      />
      {summary.data && (
        <>
          <SummaryCard summary={summary.data} />
          <DayFilter
            value={filter}
            unresolved={summary.data.pendingDays + summary.data.incompleteDays}
            onChange={setFilter}
          />
          <DayList
            days={summary.data.days.filter((day) => filter === "all" || day.unresolved)}
            today={today}
          />
        </>
      )}
    </>
  );
}
