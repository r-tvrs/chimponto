import { Outlet } from "react-router";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";
import { PunchSync } from "@/punches/punch-sync";

export function AppShell() {
  return (
    <ToastProvider>
      <PunchSync />
      {/* A rolagem fica no <main>, para o CTA fixo da Hoje parar logo acima da barra inferior. */}
      <div className="mx-auto flex h-dvh max-w-[420px] flex-col">
        <main className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1.5 pb-6">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
