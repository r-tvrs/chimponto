import { Mascote } from "@/components/mascote";
import { Button } from "@/components/ui/button";

/** Erro genérico do handoff: mascote `erro`, mensagem clara e "Tentar de novo". */
export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-[420px] flex-col p-5">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <Mascote humor="erro" size={150} />
        <h1 className="mt-2 text-[22px] leading-tight">{title}</h1>
        <p className="max-w-[280px] text-[15px] leading-[1.45] font-medium text-balance text-muted-foreground">
          {message}
        </p>
      </div>
      <Button size="lg" className="w-full" onClick={onRetry}>
        Tentar de novo
      </Button>
    </main>
  );
}
