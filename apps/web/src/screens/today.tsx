import { daySlots, formatLongDate, summarizeDay, toLocalDate } from "@chimponto/domain";
import { useEffect, useRef, useState } from "react";
import { useSignedInUser } from "@/auth/auth";
import { useCompanyRules } from "@/company/company";
import { Avatar } from "@/components/avatar";
import { ErrorState } from "@/components/error-state";
import { ScreenHeader } from "@/components/screen-header";
import { useProfile } from "@/data/profile";
import { useNow } from "@/lib/use-now";
import { useOnline } from "@/lib/use-online";
import { useOutbox } from "@/punches/outbox";
import { conflictsOf, type Punch, usePunchesOn, useQueuedPunches } from "@/punches/punches";
import { ConflictAlerts } from "./today/conflict-alerts";
import { DayAlerts } from "./today/day-alerts";
import { DayTiles } from "./today/day-tiles";
import { NextCard } from "./today/next-card";
import { PeriodTile } from "./today/period-tile";
import { PunchCta } from "./today/punch-cta";
import { PunchesCard } from "./today/punches-card";
import { PunchSheet } from "./today/punch-sheet";
import { OfflineBanner } from "./today/offline-banner";
import { type ReceiptReading, ReceiptSheet } from "./today/receipt-sheet";
import { SyncPill } from "./today/sync-pill";

/**
 * Sheet aberto: lendo a foto, a nova batida (manual, ou lida do comprovante) ou a edição de uma
 * feita. `n` remonta o sheet a cada foto, para os campos partirem da leitura nova.
 */
type SheetTarget =
  | { photo: File; n: number }
  | { editing?: Punch; reading?: ReceiptReading; message?: string; n?: number };

const UNREADABLE = "Não deu para ler o comprovante. Preencha a hora.";

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
  const conflicts = conflictsOf(queue);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const photos = useRef(0);

  // Cancelar a câmera cai no registro manual (o React não expõe `cancel` em inputs).
  useEffect(() => {
    const input = camera.current;
    const toManual = () => setSheet({});
    input?.addEventListener("cancel", toManual);
    return () => input?.removeEventListener("cancel", toManual);
  });

  /** Bater ponto abre a câmera traseira (docs/06); a foto nunca é obrigatória. */
  const openCamera = () => camera.current?.click();

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
            onPunch={openCamera}
          />
          <DayTiles summary={summary} />
          <PeriodTile rules={rules} now={now} />
        </>
      )}

      <PunchCta summary={summary} done={done} total={slots.length} onPunch={openCamera} />

      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Foto do comprovante"
        hidden
        onChange={(e) => {
          const photo = e.target.files?.[0];
          e.target.value = "";
          if (photo) setSheet({ photo, n: ++photos.current });
        }}
      />

      {sheet &&
        ("photo" in sheet ? (
          <ReceiptSheet
            key={sheet.n}
            photo={sheet.photo}
            onRead={(reading) =>
              setSheet(reading ? { reading, n: sheet.n } : { message: UNREADABLE, n: sheet.n })
            }
            onManual={() => setSheet({ n: sheet.n })}
            onClose={() => setSheet(null)}
          />
        ) : (
          <PunchSheet
            key={sheet.n}
            editing={sheet.editing}
            reading={sheet.reading}
            message={sheet.message}
            onPhoto={openCamera}
            onClose={() => setSheet(null)}
          />
        ))}
    </>
  );
}
