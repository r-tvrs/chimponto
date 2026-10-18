import { daySlots, formatLongDate, summarizeDay, toLocalDate } from "@chimponto/domain";
import { useState } from "react";
import { useSignedInUser } from "@/auth/auth";
import { useCompanyRules } from "@/company/company";
import { Avatar } from "@/components/avatar";
import { ErrorState } from "@/components/error-state";
import { ScreenHeader } from "@/components/screen-header";
import { useProfile } from "@/data/profile";
import { useNow } from "@/lib/use-now";
import { useOnline } from "@/lib/use-online";
import { useOutbox } from "@/punches/outbox";
import { type Punch, usePunchesOn, useQueuedPunches } from "@/punches/punches";
import { ConflictAlerts } from "./today/conflict-alerts";
import { DayAlerts } from "./today/day-alerts";
import { DayTiles } from "./today/day-tiles";
import { NextCard } from "./today/next-card";
import { PunchCta } from "./today/punch-cta";
import { PunchesCard } from "./today/punches-card";
import { PunchSheet } from "./today/punch-sheet";
import { OfflineBanner } from "./today/offline-banner";
import { SyncPill } from "./today/sync-pill";

/** Sheet aberto: nova batida ou a edição de uma feita. */
type SheetTarget = { editing?: Punch };

export function TodayScreen() {
  const user = useSignedInUser();
  const { data: profile } = useProfile(user.id);
  const rules = useCompanyRules();
  const now = useNow();
  const today = toLocalDate(now);
  const punches = usePunchesOn(today);
  const online = useOnline();
  const outbox = useOutbox();
  const queue = useQueuedPunches() ?? [];
  const conflicts = queue.filter((item) => item.conflict);
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

  const { slots } = daySlots(punches.data ?? [], now);
  const summary = punches.data && rules ? summarizeDay(punches.data, today, rules, now) : null;
  const done = slots.filter((slot) => slot.kind === "done").length;

  return (
    <>
      <ScreenHeader title="Hoje" eyebrow={formatLongDate(now)}>
        <SyncPill online={online} queued={queue.length - conflicts.length} />
        <Avatar displayName={profile?.display_name ?? null} email={user.email} />
      </ScreenHeader>

      {!online && <OfflineBanner />}

      <ConflictAlerts
        conflicts={conflicts}
        today={today}
        onChangeTime={(punch) => setSheet({ editing: punch })}
        onDiscard={(item) => void outbox.remove([item.seq])}
      />

      {summary && rules && (
        <>
          <NextCard
            summary={summary}
            expectedLunchMinutes={rules.expectedLunchMinutes}
            offline={!online}
          />
          <DayAlerts alerts={summary.alerts} expectedLunchMinutes={rules.expectedLunchMinutes} />
          <PunchesCard
            slots={slots}
            forecast={summary.forecast}
            onEdit={(punch) => setSheet({ editing: punch })}
            onPunch={() => setSheet({})}
          />
          <DayTiles summary={summary} />
        </>
      )}

      <PunchCta summary={summary} done={done} total={slots.length} onPunch={() => setSheet({})} />

      {sheet && <PunchSheet editing={sheet.editing} onClose={() => setSheet(null)} />}
    </>
  );
}
