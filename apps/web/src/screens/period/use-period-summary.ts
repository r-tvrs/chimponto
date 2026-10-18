import { type CompanyRules, type Period, summarizePeriod } from "@chimponto/domain";
import { usePunchesBetween } from "@/punches/punches";

/** Resumo do período com as batidas do servidor e da fila; `data` indefinido enquanto carrega. */
export function usePeriodSummary(period: Period, rules: CompanyRules | undefined, now: Date) {
  const punches = usePunchesBetween(period.start, period.end);
  return {
    data: punches.data && rules ? summarizePeriod(punches.data, period, rules, now) : undefined,
    isError: punches.isError,
    refetch: punches.refetch,
  };
}
