import { type DayAlert, formatShortDuration } from "@chimponto/domain";
import { TriangleAlert } from "lucide-react";

function textOf(alert: DayAlert, expectedLunchMinutes: number): string {
  switch (alert.kind) {
    case "short_lunch":
      return `Almoço de ${formatShortDuration(alert.minutes)} · o mínimo é ${formatShortDuration(expectedLunchMinutes)}`;
    case "missing_lunch":
      return "Falta registrar o almoço";
    case "odd_punches":
      return "Falta uma batida neste dia";
  }
}

/** Alertas do dia na Hoje (handoff §1.4): fundo `warning` tingido, não alteram o cálculo. */
export function DayAlerts({
  alerts,
  expectedLunchMinutes,
}: {
  alerts: DayAlert[];
  expectedLunchMinutes: number;
}) {
  return alerts.map((alert) => (
    <p
      key={alert.kind}
      className="flex items-center gap-2.5 rounded-2xl bg-warning/12 px-3.5 py-3 text-[13px] leading-[1.4] font-bold text-warning"
    >
      <TriangleAlert className="size-[18px] shrink-0" aria-hidden />
      <span>{textOf(alert, expectedLunchMinutes)}</span>
    </p>
  ));
}
