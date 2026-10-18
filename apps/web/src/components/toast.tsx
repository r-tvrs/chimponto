import { Banana, type LucideIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type ShowToast, ToastContext } from "./use-toast";

// Toast do handoff: topo, `bg-foreground text-background`, ícone em `banana`, some em 2,6 s.

type Toast = { id: number; text: string; icon: LucideIcon };

const DURATION_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback<ShowToast>((text, icon = Banana) => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, text, icon }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const Icon = toast?.icon;
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-3 top-10 z-50 flex justify-center"
      >
        {toast && Icon && (
          <div
            key={toast.id}
            className="flex items-center gap-2.5 rounded-2xl bg-foreground px-4 py-3 text-[13.5px] leading-[1.35] font-bold text-background shadow-[0_10px_30px_-10px_rgba(0,0,0,.4)] animate-in fade-in slide-in-from-top-4 duration-250"
          >
            <Icon className="size-[18px] shrink-0 text-banana" aria-hidden />
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
