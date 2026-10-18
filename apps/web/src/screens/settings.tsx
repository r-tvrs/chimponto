import { ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/auth/auth";
import { ScreenHeader } from "@/components/screen-header";

export function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <>
      <ScreenHeader title="Ajustes" />

      <h2 className="mx-1 mt-2 font-sans text-[11px] leading-none font-bold tracking-[0.08em] text-muted-foreground uppercase">
        Conta
      </h2>
      <div className="overflow-hidden rounded-[20px] border bg-card">
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-[58px] w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none focus-visible:bg-muted active:bg-muted"
        >
          <LogOut className="size-5 text-muted-foreground" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[14.5px] leading-tight font-semibold">Sair</span>
            <span className="text-[12.5px] leading-tight font-medium text-muted-foreground">
              Encerra a sessão neste aparelho
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        </button>
      </div>

      <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
        Chimponto 1.0 · seus dados, seu galho
      </p>
    </>
  );
}
