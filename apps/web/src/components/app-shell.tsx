import { Outlet } from "react-router";
import { BottomNav } from "@/components/bottom-nav";
import { ToastProvider } from "@/components/toast";
import { PunchSync } from "@/punches/punch-sync";

/** Casca do app logado: toasts e sincronização valem para as abas e para as telas filhas. */
export function AppShell() {
  return (
    <ToastProvider>
      <PunchSync />
      <div className="mx-auto flex h-dvh max-w-[420px] flex-col">
        <Outlet />
      </div>
    </ToastProvider>
  );
}

// A rolagem fica no <main>, para o CTA fixo parar logo acima da barra inferior (ou do fim da tela).
const MAIN_CLASS = "flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1.5 pb-6";

/** Telas das abas (Hoje, Período, Salário, Ajustes), com a barra inferior. */
export function TabsLayout() {
  return (
    <>
      <main className={MAIN_CLASS}>
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}

/** Telas filhas (Dia, Criar cofre): sem barra inferior; o voltar fica no cabeçalho. */
export function ChildLayout() {
  return (
    <main className={`${MAIN_CLASS} pb-[max(12px,env(safe-area-inset-bottom))]`}>
      <Outlet />
    </main>
  );
}
