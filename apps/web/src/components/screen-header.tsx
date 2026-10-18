import type { ReactNode } from "react";

/** Cabeçalho de tela (52px): título Fredoka 28, linha de apoio opcional e ações à direita. */
export function ScreenHeader({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}) {
  return (
    <header className="flex min-h-[52px] items-center gap-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        {eyebrow && (
          <span className="text-[12.5px] leading-none font-semibold text-muted-foreground">
            {eyebrow}
          </span>
        )}
        <h1 className="text-[28px] leading-none">{title}</h1>
      </div>
      {children}
    </header>
  );
}
