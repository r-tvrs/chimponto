import type { LucideIcon } from "lucide-react";
import { createContext, useContext } from "react";

/** Mostra um toast; sem ícone, usa `Banana`. */
export type ShowToast = (text: string, icon?: LucideIcon) => void;

export const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast precisa de um ToastProvider");
  return show;
}
