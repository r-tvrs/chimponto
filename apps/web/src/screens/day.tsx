import {
  type CompanyRules,
  type DayPunch,
  type DraftPunch,
  formatDayMonth,
  formatWeekday,
  fromLocal,
  initialDraft,
  type LocalDate,
  type LocalTime,
  labelDraftDay,
  periodContaining,
  summarizeDay,
  toLocalDate,
  toLocalTime,
} from "@chimponto/domain";
import { ChevronLeft, CloudOff, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { v7 as uuidv7 } from "uuid";
import { useCompanyRules } from "@/company/company";
import { ErrorState } from "@/components/error-state";
import { Mascote } from "@/components/mascote";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/use-toast";
import { useNow } from "@/lib/use-now";
import { useOnline } from "@/lib/use-online";
import { type Punch, type PunchWrite, usePunchesBetween, useWritePunch } from "@/punches/punches";
import { DayAlerts } from "./day/day-alerts";
import { DayPunchesCard, type DraftRowValue } from "./day/day-punches-card";
import { DayTiles } from "./day/day-tiles";

const OFFLINE_TOAST = "Salvo no aparelho. Sobe quando o sinal voltar.";
const SAVE_FAILED_TOAST = "Não deu para salvar o dia. Tente de novo.";

/**
 * Tela Dia (handoff §6): corrige as batidas de um dia passado. Hoje fica na Hoje; dias futuros e
 * datas inválidas voltam ao Período.
 */
export function DayScreen() {
  const { date = "" } = useParams();
  const rules = useCompanyRules();
  const now = useNow();
  const today = toLocalDate(now);

  if (!fromLocal(date, "12:00")) return <Navigate to="/periodo" replace />;
  if (date === today) return <Navigate to="/" replace />;
  if (date > today) return <Navigate to="/periodo" replace />;
  return rules ? <DayContent date={date} rules={rules} now={now} /> : null;
}

function DayContent({ date, rules, now }: { date: LocalDate; rules: CompanyRules; now: Date }) {
  const period = periodContaining(date, rules);
  // Pela consulta do Período (mesmo cache): sem conexão, o Dia mostra as batidas que o Período mostrou.
  const punches = usePunchesBetween(period.start, period.end);
  const saved = punches.data?.filter((p) => toLocalDate(p.punchedAt) === date);

  return (
    <>
      <header className="-ml-2 flex min-h-[52px] items-center gap-1.5">
        {/* `replace`: o Dia sai do histórico, e o voltar do sistema não o reabre. */}
        <Link
          to="/periodo"
          state={{ date }}
          replace
          aria-label="Voltar"
          className="flex size-11 items-center justify-center rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 [&_svg]:size-6"
        >
          <ChevronLeft />
        </Link>
        <div className="flex flex-col gap-[3px]">
          <span className="text-xs leading-none font-semibold text-muted-foreground">
            Período {formatDayMonth(period.start)} → {formatDayMonth(period.end)}
          </span>
          <h1 className="text-2xl leading-none">
            {formatWeekday(date)}, {formatDayMonth(date)}
          </h1>
        </div>
      </header>

      {/* Com as batidas em mãos, uma releitura que falha não tira o editor (nem o rascunho). */}
      {punches.queueOnly ? (
        <OfflineDay />
      ) : saved ? (
        <DayEditor date={date} rules={rules} now={now} saved={saved} />
      ) : (
        punches.isError && (
          <ErrorState
            inShell
            title="Não deu para abrir o dia"
            message="Confira a conexão e tente de novo."
            onRetry={() => void punches.refetch()}
          />
        )
      )}
    </>
  );
}

/**
 * Sem conexão e sem o período no aparelho: um dia vazio levaria a redigitar batidas que já existem
 * no servidor. A tela espera; quando o sinal volta, a consulta continua e o editor aparece.
 */
function OfflineDay() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <Mascote humor="offline" size={150} />
      <h2 className="mt-2 text-[22px] leading-tight">Sem sinal na selva</h2>
      <p className="max-w-[280px] text-[15px] leading-[1.45] font-medium text-balance text-muted-foreground">
        Este dia ainda não está no aparelho. Ele abre quando a conexão voltar.
      </p>
    </section>
  );
}

/** O rascunho do dia: começa com as batidas salvas e só vai para a outbox em "Salvar dia". */
function DayEditor({
  date,
  rules,
  now,
  saved,
}: {
  date: LocalDate;
  rules: CompanyRules;
  now: Date;
  saved: Punch[];
}) {
  // Até a primeira edição, o rascunho acompanha as batidas salvas (uma da fila pode estar subindo).
  const savedKey = saved.map((p) => `${p.id}@${p.punchedAt.getTime()}`).join();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `savedKey` resume `saved`
  const pristine = useMemo(() => initialDraft(saved, uuidv7).map(rowOf), [savedKey]);
  // Na primeira edição, `base` guarda as salvas daquele momento: "Salvar dia" grava a diferença
  // para elas, e o que mudar depois (leitura nova, outro aparelho) não vira escrita.
  const [edited, setEdited] = useState<{ rows: DraftRowValue[]; base: Punch[] } | null>(null);
  const rows = edited?.rows ?? pristine;
  const setRows = (change: (current: DraftRowValue[]) => DraftRowValue[]) =>
    setEdited((current) => ({
      rows: change(current?.rows ?? pristine),
      base: current?.base ?? saved,
    }));
  const [saving, setSaving] = useState(false);
  const writePunch = useWritePunch();
  const toast = useToast();
  const online = useOnline();
  const navigate = useNavigate();

  const draft = rows.map((row) => ({ id: row.id, punchedAt: instantOf(date, row.time) }));
  const labeled = labelDraftDay(draft, now);
  const filled = draft.flatMap((row) =>
    row.punchedAt ? [{ ...row, punchedAt: row.punchedAt }] : [],
  );
  const summary = summarizeDay(filled, date, rules, now);
  const duplicate = labeled.some((row) => row.duplicate);

  /**
   * Grava na outbox (D3) só o que o usuário mudou e volta ao período do dia. Se o aparelho não
   * gravar, fica no Dia com o rascunho; salvar de novo repete as escritas que já tinham entrado na
   * fila (mesmo id e valores: não muda o resultado).
   */
  async function save() {
    if (duplicate) return;
    setSaving(true);
    try {
      for (const write of writesOf(edited?.base ?? saved, filled, new Date())) {
        await writePunch(write);
      }
    } catch {
      setSaving(false);
      toast(SAVE_FAILED_TOAST, TriangleAlert);
      return;
    }
    void navigate("/periodo", { replace: true, state: { date } });
    if (online) toast(`Dia ${Number(date.slice(8, 10))} salvo`);
    else toast(OFFLINE_TOAST, CloudOff);
  }

  return (
    <>
      <DayAlerts
        alerts={summary.alerts}
        punchCount={filled.length}
        expectedLunchMinutes={rules.expectedLunchMinutes}
      />
      <DayPunchesCard
        rows={rows.map((row, i) => ({ ...row, ...labeled[i]! }))}
        onChange={(id, time) =>
          setRows((current) => current.map((row) => (row.id === id ? { ...row, time } : row)))
        }
        onRemove={(id) => setRows((current) => current.filter((row) => row.id !== id))}
        onAdd={() => setRows((current) => [...current, emptyRow()])}
      />
      <DayTiles summary={summary} />
      <div className="sticky bottom-0 -mx-4 mt-auto bg-linear-to-t from-background from-72% to-transparent px-4 pt-[18px] pb-3">
        <Button
          size="lg"
          className="w-full"
          disabled={duplicate || saving}
          onClick={() => void save()}
        >
          Salvar dia
        </Button>
      </div>
    </>
  );
}

/**
 * Escritas que levam as batidas salvas ao rascunho: exclusões primeiro (liberam o minuto no
 * servidor), depois edições (cada uma depois da que libera o seu minuto) e batidas novas. Batida sem
 * mudança não gera escrita.
 */
function writesOf(saved: Punch[], filled: DayPunch[], now: Date): PunchWrite[] {
  const draftById = new Map(filled.map((row) => [row.id, row]));
  const savedIds = new Set(saved.map((p) => p.id));
  const deletes = saved
    .filter((p) => !draftById.has(p.id))
    .map((p) => ({ ...p, updatedAt: now, deletedAt: now }));
  const edits = saved.flatMap((p) => {
    const row = draftById.get(p.id);
    return row && row.punchedAt.getTime() !== p.punchedAt.getTime()
      ? [{ ...p, punchedAt: row.punchedAt, updatedAt: now, deletedAt: null }]
      : [];
  });
  const inserts = filled
    .filter((row) => !savedIds.has(row.id))
    .map((row) => ({
      id: row.id,
      punchedAt: row.punchedAt,
      source: "manual" as const,
      note: null,
      updatedAt: now,
      deletedAt: null,
    }));
  return [...deletes, ...vacatingFirst(edits, saved), ...inserts];
}

/**
 * Edições numa ordem em que cada uma acha o seu minuto livre no servidor: a que sai de um minuto
 * sobe antes da que entra nele. Uma troca em ciclo não tem essa ordem e segue como veio (docs/08 #17).
 */
function vacatingFirst(edits: PunchWrite[], saved: Punch[]): PunchWrite[] {
  const savedMinute = new Map(saved.map((p) => [p.id, p.punchedAt.getTime()]));
  const pending = [...edits];
  const ordered: PunchWrite[] = [];
  while (pending.length > 0) {
    const free = pending.findIndex(
      (edit) => !pending.some((other) => savedMinute.get(other.id) === edit.punchedAt.getTime()),
    );
    ordered.push(...pending.splice(Math.max(free, 0), 1));
  }
  return ordered;
}

/** Linha da tela para uma linha do rascunho; sem hora, `time` vazio. */
function rowOf({ id, punchedAt }: DraftPunch): DraftRowValue {
  return { id, time: punchedAt ? toLocalTime(punchedAt) : "" };
}

/** Linha sem hora; o id vira o da batida nova se ela for preenchida. */
function emptyRow(): DraftRowValue {
  return { id: uuidv7(), time: "" };
}

function instantOf(date: LocalDate, time: LocalTime): Date | null {
  return time ? fromLocal(date, time) : null;
}
