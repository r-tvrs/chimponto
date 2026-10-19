import { formatDuration, formatShortDuration, formatWorkdays } from "@chimponto/domain";
import {
  Building2,
  ChevronRight,
  LogOut,
  type LucideIcon,
  Monitor,
  Moon,
  Sun,
  TriangleAlert,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";
import { Link } from "react-router";
import { useAuth, useSignedInUser } from "@/auth/auth";
import { useMembership } from "@/company/company";
import { Avatar } from "@/components/avatar";
import { ErrorState } from "@/components/error-state";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/use-toast";
import { useProfile, useSaveDisplayName } from "@/data/profile";
import { setTheme, storedTheme, type Theme } from "@/lib/theme";

const THEMES: { theme: Theme; label: string; Icon: LucideIcon }[] = [
  { theme: "light", label: "Claro", Icon: Sun },
  { theme: "dark", label: "Escuro", Icon: Moon },
  { theme: "system", label: "Sistema", Icon: Monitor },
];

/** Ajustes da v1 (handoff §9): perfil, Empresa, Conta e Aparência. Os grupos de fases futuras ficam ocultos. */
export function SettingsScreen() {
  const { signOut } = useAuth();
  const user = useSignedInUser();
  const { data: profile } = useProfile(user.id);
  const membership = useMembership().data;
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [theme, setThemeState] = useState(storedTheme);
  const displayName = profile?.display_name ?? null;

  // Se der certo, a guarda de rotas leva ao Login.
  async function leave() {
    setSignOutFailed(false);
    if ((await signOut()) === "failed") setSignOutFailed(true);
  }

  function pickTheme(next: Theme) {
    setTheme(next);
    setThemeState(next);
  }

  if (signOutFailed) {
    return (
      <ErrorState
        inShell
        title="Não deu para sair"
        message="Confira a conexão e tente de novo em um minuto."
        onRetry={() => void leave()}
      />
    );
  }

  return (
    <>
      <ScreenHeader title="Ajustes" />

      <button
        type="button"
        onClick={() => setEditingName(true)}
        className="flex items-center gap-3 rounded-[20px] border bg-card p-3.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 active:bg-muted"
      >
        <Avatar displayName={displayName} email={user.email} className="size-12 text-[15px]" />
        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="truncate text-base leading-tight font-bold">
            {displayName || user.email}
          </span>
          <span className="truncate text-[12.5px] leading-tight font-medium text-muted-foreground">
            {membership ? `${user.email} · ${membership.companyName}` : user.email}
          </span>
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </button>

      {membership && (
        <Group title="Empresa">
          <div className={CARD_CLASS}>
            <Row
              to="/ajustes/empresa"
              Icon={Building2}
              title={membership.companyName}
              support={`Jornada ${formatDuration(membership.rules.dailyMinutes)} · ${formatWorkdays(membership.rules.workdays)} · almoço ${formatShortDuration(membership.rules.expectedLunchMinutes)}`}
            />
          </div>
        </Group>
      )}

      <Group title="Conta">
        <div className={CARD_CLASS}>
          <Row
            onClick={() => void leave()}
            Icon={LogOut}
            title="Sair"
            support="Encerra a sessão neste aparelho"
          />
        </div>
      </Group>

      <Group title="Aparência">
        <div
          role="radiogroup"
          aria-label="Tema"
          className="grid grid-cols-3 gap-1 rounded-[14px] bg-muted p-1"
        >
          {THEMES.map(({ theme: option, label, Icon }) => (
            <label
              key={option}
              className="relative flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[11px] text-[13.5px] font-bold text-muted-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm has-focus-visible:ring-[3px] has-focus-visible:ring-ring/30"
            >
              <input
                type="radio"
                name="theme"
                value={option}
                checked={theme === option}
                onChange={() => pickTheme(option)}
                className="absolute inset-0 cursor-pointer appearance-none rounded-[inherit] outline-none"
              />
              <Icon className="size-4" aria-hidden />
              {label}
            </label>
          ))}
        </div>
      </Group>

      <p className="mt-2 text-center text-xs font-semibold text-muted-foreground">
        Chimponto 1.0 · seus dados, seu galho
      </p>

      {/* A key remonta o sheet a cada abertura: começa do nome salvo. */}
      <DisplayNameSheet
        key={String(editingName)}
        open={editingName}
        onOpenChange={setEditingName}
        userId={user.id}
        current={displayName ?? ""}
      />
    </>
  );
}

const CARD_CLASS = "overflow-hidden rounded-[20px] border bg-card";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="mx-1 mt-2 font-sans text-[11px] leading-none font-bold tracking-[0.08em] text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const ROW_CLASS =
  "flex min-h-[58px] w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:ring-inset focus-visible:inset-ring focus-visible:inset-ring-ring active:bg-muted";

/** Linha de grupo (58px): ícone, título, apoio e `ChevronRight`. Com `to`, é um link. */
function Row({
  Icon,
  title,
  support,
  to,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  support: string;
  to?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[14.5px] leading-tight font-semibold">{title}</span>
        <span className="text-[12.5px] leading-tight font-medium text-muted-foreground">
          {support}
        </span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </>
  );
  return to ? (
    <Link to={to} className={ROW_CLASS}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={ROW_CLASS}>
      {content}
    </button>
  );
}

function DisplayNameSheet({
  open,
  onOpenChange,
  userId,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  current: string;
}) {
  const saveDisplayName = useSaveDisplayName(userId);
  const toast = useToast();
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const result = await saveDisplayName(name);
    setSaving(false);
    if (result === "failed") toast("Não deu para salvar o nome. Tente de novo.", TriangleAlert);
    else onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Seu nome">
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3.5">
        <Input
          aria-label="Nome de exibição"
          placeholder="Como quer ser chamado"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background"
        />
        <p className="text-[12.5px] font-medium text-muted-foreground">
          As iniciais aparecem no avatar. Vazio, usamos o e-mail.
        </p>
        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </Sheet>
  );
}
