import { Mascote } from "@/components/mascote";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Erro genérico do handoff: mascote `erro`, mensagem clara e "Tentar de novo".
 * Ocupa a tela toda; com `inShell`, só a área da casca do app, acima da barra inferior.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  inShell = false,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  inShell?: boolean;
}) {
  const Root = inShell ? "section" : "main";
  return (
    <Root
      role="alert"
      className={cn("flex flex-col", inShell ? "flex-1" : "mx-auto min-h-dvh max-w-[420px] p-5")}
    >
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
    </Root>
  );
}
