import { daySlots, formatLongDate, summarizeDay, toLocalDate } from "@chimponto/domain";
import { useRef, useState } from "react";
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
import { CameraSheet } from "./today/camera-sheet";
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
 * Sheet aberto: a câmera, lendo a foto, a nova batida (manual, ou lida do comprovante) ou a edição de uma
 * feita. `n` remonta o sheet a cada foto, para os campos partirem da leitura nova.
 */
type SheetTarget =
  | { camera: true }
  | { photo: Blob; n: number }
  | { editing?: Punch; reading?: ReceiptReading; message?: string; n?: number };

const UNREADABLE = "Não deu para ler o comprovante. Preencha a hora.";
const NO_CAMERA = "Não deu para abrir a câmera. Preencha a hora.";

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
  const photos = useRef(0);

  const openCamera = () => setSheet({ camera: true });
  /** Bater ponto abre o registro manual; a foto do comprovante é opcional, pelo botão do sheet (docs/06). */
  const openPunch = () => setSheet({ n: ++photos.current });

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
            onPunch={openPunch}
          />
          <DayTiles summary={summary} />
          <PeriodTile rules={rules} now={now} />
        </>
      )}

      <PunchCta summary={summary} done={done} total={slots.length} onPunch={openPunch} />

      {sheet &&
        ("camera" in sheet ? (
          <CameraSheet
            onPhoto={(photo) => setSheet({ photo, n: ++photos.current })}
            onDenied={() => setSheet({ message: NO_CAMERA, n: ++photos.current })}
            onManual={() => setSheet({ n: ++photos.current })}
            onClose={() => setSheet(null)}
          />
        ) : "photo" in sheet ? (
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
