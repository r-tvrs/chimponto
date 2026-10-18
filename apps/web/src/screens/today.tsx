import { daySlots, formatLongDate, toLocalDate } from "@chimponto/domain";
import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { useSignedInUser } from "@/auth/auth";
import { Avatar } from "@/components/avatar";
import { ErrorState } from "@/components/error-state";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/data/profile";
import { PUNCH_LABELS } from "@/punches/punch-labels";
import { type Punch, usePunchesOn } from "@/punches/punches";
import { PunchesCard } from "./today/punches-card";
import { PunchSheet } from "./today/punch-sheet";

/** Sheet aberto: nova batida ou a edição de uma feita. */
type SheetTarget = { editing?: Punch };

export function TodayScreen() {
  const user = useSignedInUser();
  const { data: profile } = useProfile(user.id);
  const now = new Date();
  const punches = usePunchesOn(toLocalDate(now));
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  if (punches.isError) {
    return (
      <ErrorState
        inShell
        title="Não deu para abrir suas batidas"
        message="Confira a conexão e tente de novo."
        onRetry={() => void punches.refetch()}
      />
    );
  }

  // Num dia par de 4+ o CTA oferece a batida extra; o estado "Dia completo" chega no #5.
  const { slots, next } = daySlots(punches.data ?? [], now);

  return (
    <>
      <ScreenHeader title="Hoje" eyebrow={formatLongDate(now)}>
        <Avatar displayName={profile?.display_name ?? null} email={user.email} />
      </ScreenHeader>

      {punches.data && (
        <PunchesCard
          slots={slots}
          onEdit={(punch) => setSheet({ editing: punch })}
          onPunch={() => setSheet({})}
        />
      )}

      {/* CTA fixo na metade de baixo, sobre um degradê do fundo (handoff §1.8). */}
      <div className="sticky bottom-0 -mx-4 mt-auto bg-linear-to-t from-background from-72% to-transparent px-4 pt-[18px] pb-3">
        <Button
          size="ponto"
          disabled={!punches.data}
          onClick={() => setSheet({})}
          className="shadow-[inset_0_-3px_0_color-mix(in_oklab,var(--primary)_70%,var(--foreground)),0_8px_20px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
        >
          <Fingerprint aria-hidden />
          <span className="flex flex-col items-start gap-0.5">
            <span className="leading-none">Bater ponto</span>
            <span className="text-xs leading-none font-bold opacity-80">
              {PUNCH_LABELS[next].phrase}
            </span>
          </span>
        </Button>
      </div>

      {sheet && <PunchSheet editing={sheet.editing} onClose={() => setSheet(null)} />}
    </>
  );
}
