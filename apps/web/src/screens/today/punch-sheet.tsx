import {
  fromLocal,
  isDuplicateMinute,
  previewPunch,
  toLocalDate,
  toLocalTime,
  truncateToMinute,
} from "@chimponto/domain";
import { Trash2, TriangleAlert } from "lucide-react";
import { type FormEvent, useState } from "react";
import { v7 as uuidv7 } from "uuid";
import { useToast } from "@/components/use-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { PUNCH_LABELS } from "@/punches/punch-labels";
import { type Punch, type PunchWrite, usePunchesOn, useWritePunch } from "@/punches/punches";

type Problem = "duplicate" | "stale" | "failed";

const PROBLEM_TEXT: Record<Exclude<Problem, "duplicate">, string> = {
  stale: "Essa batida mudou em outro aparelho. Confira e tente de novo.",
  failed: "Não deu para salvar. Confira a conexão e tente de novo.",
};

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
  const writePunch = useWritePunch();
  const toast = useToast();
  const [initialInstant] = useState(() => truncateToMinute(editing?.punchedAt ?? new Date()));
  // Um id por sheet: se a resposta se perder, tentar de novo reenvia a mesma batida.
  const [id] = useState(() => editing?.id ?? uuidv7());
  const [date, setDate] = useState(toLocalDate(initialInstant));
  const [time, setTime] = useState(toLocalTime(initialInstant));
  const [note, setNote] = useState(editing?.note ?? "");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const at = fromLocal(date, time);
  const day = usePunchesOn(at ? date : toLocalDate(initialInstant));
  const candidate = at && { at, editingId: editing?.id };
  const preview = candidate && day.data && previewPunch(day.data, candidate, new Date());
  const duplicate = !!candidate && !!day.data && isDuplicateMinute(day.data, candidate);
  const shownProblem = duplicate ? "duplicate" : problem;

  /** Mudar data ou hora apaga o erro do último envio. */
  function editField(update: () => void) {
    update();
    setProblem(null);
  }

  async function write(punch: PunchWrite): Promise<boolean> {
    setSaving(true);
    const result = await writePunch(punch);
    setSaving(false);
    if (result === "applied") return true;
    setProblem(result === "duplicate_minute" ? "duplicate" : result);
    return false;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!at || !preview || duplicate) return;
    const saved = await write({
      id,
      punchedAt: at,
      source: editing?.source ?? "manual",
      note: note.trim() || null,
      updatedAt: new Date(),
      deletedAt: null,
    });
    if (!saved) return;
    onClose();
    // Toast temático só na batida nova; na edição, a confirmação neutra (docs/07).
    toast(editing ? `Batida das ${time} salva.` : PUNCH_LABELS[preview.label].toast(time));
  }

  async function remove() {
    if (!editing) return;
    const now = new Date();
    if (await write({ ...editing, updatedAt: now, deletedAt: now })) {
      onClose();
      toast("Batida excluída.", Trash2);
    }
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
              onChange={(e) => editField(() => setDate(e.target.value))}
              className="h-14 bg-background px-3 text-[15px] font-bold tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-muted-foreground">Hora</span>
            <Input
              type="time"
              required
              value={time}
              onChange={(e) => editField(() => setTime(e.target.value))}
              className="h-14 bg-background px-3 text-[22px] font-extrabold tabular-nums"
            />
          </label>
        </div>

        {shownProblem ? (
          <p
            role="alert"
            className="flex items-center gap-2.5 rounded-[14px] bg-negative/12 px-3.5 py-3 text-[13px] leading-[1.4] font-bold text-negative"
          >
            <TriangleAlert className="size-[18px] shrink-0" aria-hidden />
            {shownProblem === "duplicate"
              ? `Já tem uma batida às ${time}.`
              : PROBLEM_TEXT[shownProblem]}
          </p>
        ) : (
          preview && (
            <p className="text-[12.5px] leading-[1.4] font-semibold text-muted-foreground">
              {editing ? "Vai ficar como " : "Vai entrar como "}
              <b className="text-foreground">{PUNCH_LABELS[preview.label].phrase}</b>.
            </p>
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
