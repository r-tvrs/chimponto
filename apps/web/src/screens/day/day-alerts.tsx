import { type DayAlert, formatPunchCount, formatShortDuration } from "@chimponto/domain";
import { TriangleAlert } from "lucide-react";

function textOf(
  alert: DayAlert,
  punchCount: number,
  expectedLunchMinutes: number,
): { title: string; detail: string } {
  switch (alert.kind) {
    case "short_lunch":
      return {
        title: `Almoço de ${formatShortDuration(alert.minutes)}`,
        detail: `O mínimo é ${formatShortDuration(expectedLunchMinutes)} para jornada acima de 6h (CLT).`,
      };
    case "missing_lunch":
      return {
        title: "Falta registrar o almoço",
        detail: "Só entrada e saída, com mais de 6h entre elas.",
      };
    case "odd_punches":
      return {
        title: formatPunchCount(punchCount),
        detail: "Falta uma batida neste dia.",
      };
  }
}

/** Alertas da tela Dia (handoff §6.2): cards `warning` com título e detalhe. */
export function DayAlerts({
  alerts,
  punchCount,
  expectedLunchMinutes,
}: {
  alerts: DayAlert[];
  punchCount: number;
  expectedLunchMinutes: number;
}) {
  return alerts.map((alert) => {
    const { title, detail } = textOf(alert, punchCount, expectedLunchMinutes);
    return (
      <div
        key={alert.kind}
        className="flex gap-2.5 rounded-[14px] bg-warning/12 px-3.5 py-3 text-warning"
      >
        <TriangleAlert className="size-[18px] shrink-0" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13.5px] leading-[1.3] font-extrabold">{title}</span>
          <span className="text-[12.5px] leading-[1.4] font-semibold">{detail}</span>
        </div>
      </div>
    );
  });
}
