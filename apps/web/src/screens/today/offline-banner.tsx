import { useId } from "react";
import { Mascote } from "@/components/mascote";

/** Banner "Sem sinal na selva" da Hoje (handoff §1.2), só sem conexão. */
export function OfflineBanner() {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="flex items-center gap-3 rounded-2xl bg-muted py-2.5 pr-3.5 pl-2.5"
    >
      <Mascote humor="offline" size={52} decorativo className="bg-pending/18" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 id={titleId} className="font-sans text-sm leading-tight font-bold">
          Sem sinal na selva
        </h2>
        <p className="text-[12.5px] leading-[1.35] font-medium text-muted-foreground">
          Suas batidas ficam salvas aqui e sobem quando a conexão voltar.
        </p>
      </div>
    </section>
  );
}
