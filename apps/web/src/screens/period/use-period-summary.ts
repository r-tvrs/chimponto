import { type CompanyRules, type Period, summarizePeriod } from "@chimponto/domain";
import { useDayMarksBetween, usePunchesBetween } from "@/punches/punches";

/**
 * Resumo do período com as batidas e marcações do servidor e da fila; `data` indefinido enquanto
 * carrega.
 */
export function usePeriodSummary(period: Period, rules: CompanyRules | undefined, now: Date) {
  const punches = usePunchesBetween(period.start, period.end);
  const marks = useDayMarksBetween(period.start, period.end);
  return {
    data:
      punches.data && marks.data && rules
        ? summarizePeriod(punches.data, period, rules, now, marks.data)
        : undefined,
    isError: punches.isError || marks.isError,
    refetch: () => Promise.all([punches.refetch(), marks.refetch()]),
  };
}
