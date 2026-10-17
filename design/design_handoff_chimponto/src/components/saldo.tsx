import { cn } from "@/lib/utils";
import { saldoFalado, saldoTexto, saldoTom } from "@/lib/ponto";

/** Saldo de horas: sempre sinal + cor + tabular-nums. Nunca depende só da cor. */
export function Saldo({ min, className }: { min: number; className?: string }) {
  const tom = saldoTom(min);
  return (
    <span
      aria-label={saldoFalado(min)}
      className={cn(
        "font-extrabold tabular-nums",
        tom === "positive" && "text-positive",
        tom === "negative" && "text-negative",
        tom === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      {saldoTexto(min)}
    </span>
  );
}
