import { CalendarDays, Clock, type LucideIcon, Settings, Wallet } from "lucide-react";
import { NavLink } from "react-router";

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Hoje", icon: Clock },
  { to: "/periodo", label: "Período", icon: CalendarDays },
  { to: "/salario", label: "Salário", icon: Wallet },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

/** Barra inferior. O NavLink marca a aba ativa com aria-current="page". */
export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="sticky bottom-0 grid grid-cols-4 border-t bg-card px-1 pt-1.5 pb-[max(16px,env(safe-area-inset-bottom))]"
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="group flex min-h-[54px] flex-col items-center justify-center gap-1 outline-none"
        >
          <span className="flex h-[30px] w-14 items-center justify-center rounded-full text-muted-foreground transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring/30 group-focus-visible:inset-ring group-focus-visible:inset-ring-ring group-aria-[current=page]:bg-primary group-aria-[current=page]:text-primary-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
          <span className="text-[11.5px] leading-none font-semibold text-muted-foreground group-aria-[current=page]:font-extrabold group-aria-[current=page]:text-foreground">
            {label}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
