import { Outlet } from "react-router";
import { BottomNav } from "@/components/bottom-nav";

export function AppShell() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[420px] flex-col">
      <main className="flex flex-1 flex-col gap-3 px-4 pt-1.5 pb-6">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
