import {
  balanceTone,
  formatBalance,
  formatShortDuration,
  fromLocal,
  isDuplicateMinute,
  previewPunch,
  toLocalDate,
  toLocalTime,
  truncateToMinute,
} from "@chimponto/domain";
import { onlineManager } from "@tanstack/react-query";
import { CircleCheck, Clock, CloudOff, Trash2, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { useCompanyRules } from "@/company/company";
import { useToast } from "@/components/use-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PUNCH_LABELS } from "@/punches/punch-labels";
import { type Punch, type PunchWrite, usePunchesOn, useWritePunch } from "@/punches/punches";

const OFFLINE_TOAST = "Salvo no aparelho. Sobe quando o sinal voltar.";

/**
 * Sheet "Bater ponto" (handoff §2 com os ajustes de docs/07): data e hora pré-preenchidas, sem
 * escolha de tipo, só o rótulo derivado ao vivo. Com `editing`, edita ou exclui aquela batida.
 */
export function PunchSheet({
  editing,
  onClose,
}: {
  editing?: Punch | undefined;
  onClose: () => void;
}) {
  const rules = useCompanyRules();
  const writePunch = useWritePunch();
  const toast = useToast();
  const [initialInstant] = useState(() => truncateToMinute(editing?.punchedAt ?? new Date()));
  // Um id por sheet: salvar de novo antes de a fila subir substitui a mesma batida.
  const [id] = useState(() => editing?.id ?? uuidv7());
  const [date, setDate] = useState(toLocalDate(initialInstant));
  const [time, setTime] = useState(toLocalTime(initialInstant));
  const [note, setNote] = useState(editing?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const at = fromLocal(date, time);
  const day = usePunchesOn(at ? date : toLocalDate(initialInstant));
  const candidate = at && { at, editingId: editing?.id };
  const preview =
    candidate && day.data && rules && previewPunch(day.data, candidate, rules, new Date());
  const duplicate = !!candidate && !!day.data && isDuplicateMinute(day.data, candidate);

  /** Grava na outbox e fecha; sem conexão, o toast avisa que a batida ficou no aparelho. */
  async function write(punch: PunchWrite, text: string, icon?: typeof Trash2) {
    setSaving(true);
    await writePunch(punch);
    onClose();
    if (onlineManager.isOnline()) toast(text, icon);
    else toast(OFFLINE_TOAST, CloudOff);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!at || !preview || duplicate) return;
    // Toast temático só na batida nova; na edição, a confirmação neutra (docs/07).
    await write(
      {
        id,
        punchedAt: at,
        source: editing?.source ?? "manual",
        note: note.trim() || null,
        updatedAt: new Date(),
        deletedAt: null,
      },
      editing ? `Batida das ${time} salva.` : PUNCH_LABELS[preview.label].toast(time),
    );
  }

  async function remove() {
    if (!editing) return;
    const now = new Date();
    await write({ ...editing, updatedAt: now, deletedAt: now }, "Batida excluída.", Trash2);
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={editing ? "Editar batida" : "Bater ponto"}
    >
      <form noValidate onSubmit={save} className="flex flex-col gap-3.5">
        <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">Data</span>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-14 bg-background px-3 text-[15px] font-bold tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">Hora</span>
            <Input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="h-14 bg-background px-3 text-[22px] font-extrabold tabular-nums"
            />
          </label>
        </div>

        {duplicate ? (
          <p
            role="alert"
            className="flex items-center gap-2.5 rounded-[14px] bg-negative/12 px-3.5 py-3 text-[13px] leading-[1.4] font-bold text-negative"
          >
            <TriangleAlert className="size-[18px] shrink-0" aria-hidden />
            Já tem uma batida às {time}.
          </p>
        ) : (
          preview && (
            <>
              <p className="text-[12.5px] leading-[1.4] font-semibold text-muted-foreground">
                {editing ? "Vai ficar como " : "Vai entrar como "}
                <b className="text-foreground">{PUNCH_LABELS[preview.label].phrase}</b>.
              </p>
              {preview.shortLunch && rules && (
                <LiveWarning tone="warning" icon={TriangleAlert}>
                  Almoço de {formatShortDuration(preview.shortLunch.minutes)}. O mínimo é{" "}
                  {formatShortDuration(rules.expectedLunchMinutes)}; volta prevista às{" "}
                  {toLocalTime(preview.shortLunch.returnAt)}.
                </LiveWarning>
              )}
              {preview.dayBalance !== null && (
                <LiveWarning
                  tone={balanceTone(preview.dayBalance)}
                  icon={balanceTone(preview.dayBalance) === "negative" ? Clock : CircleCheck}
                >
                  Com essa {preview.label === "exit" ? "saída" : "batida"}, o saldo do dia fica{" "}
                  {formatBalance(preview.dayBalance)}.
                </LiveWarning>
              )}
            </>
          )
        )}

        <Input
          aria-label="Observação"
          placeholder="Observação (opcional)"
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-12 bg-background px-3.5 text-[15px] font-medium"
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!preview || duplicate || saving}
        >
          Salvar batida
        </Button>

        {editing && (
          <Button
            type="button"
            variant="ghost"
            className="text-negative"
            disabled={saving}
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 aria-hidden />
            Excluir batida
          </Button>
        )}
      </form>

      {editing && (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title={`Excluir a batida das ${toLocalTime(editing.punchedAt)}?`}
          description="Ela sai do dia e fica só no histórico."
          confirmLabel="Excluir"
          onConfirm={() => void remove()}
        />
      )}
    </Sheet>
  );
}

const TONE_CLASS = {
  warning: "bg-warning/12 text-warning",
  positive: "bg-positive/12 text-positive",
  negative: "bg-negative/12 text-negative",
  neutral: "bg-muted text-muted-foreground",
};

/** Aviso ao vivo do sheet (handoff §2): fundo tingido, 13/700, ícone 18. */
function LiveWarning({
  tone,
  icon: Icon,
  children,
}: {
  tone: keyof typeof TONE_CLASS;
  icon: typeof CircleCheck;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] leading-[1.4] font-bold",
        TONE_CLASS[tone],
      )}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
