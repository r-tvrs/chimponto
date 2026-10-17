import { balanceTone, formatBalance, spokenBalance } from "@chimponto/domain";
import { cn } from "@/lib/utils";

/** Saldo de horas: sempre sinal + cor + tabular-nums. Nunca depende só da cor. */
export function Saldo({ min, className }: { min: number; className?: string }) {
  const tone = balanceTone(min);
  return (
    <span
      aria-label={spokenBalance(min)}
      className={cn(
        "font-extrabold tabular-nums",
        tone === "positive" && "text-positive",
        tone === "negative" && "text-negative",
        tone === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      {formatBalance(min)}
    </span>
  );
}
