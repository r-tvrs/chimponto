import { type LocalDate, toLocalDate } from "@chimponto/domain";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useCallback, useContext } from "react";
import { useSignedInUser } from "@/auth/auth";
import { type OutboxItem, useOutbox } from "./outbox";

export type Punch = {
  id: string;
  punchedAt: Date;
  source: "manual" | "ocr";
  note: string | null;
  updatedAt: Date;
};

/** Criação, edição ou exclusão lógica (`deletedAt`), sempre com a batida inteira (LWW). */
export type PunchWrite = Punch & { deletedAt: Date | null };

/** A batida de uma escrita, sem a marca de exclusão. */
export function punchOf({ id, punchedAt, source, note, updatedAt }: PunchWrite): Punch {
  return { id, punchedAt, source, note, updatedAt };
}

/**
 * Resposta do `upsert_punch`. `failed`: falha que passa sozinha (rede, sessão expirada, servidor
 * fora), vale tentar de novo; `rejected`: o servidor recusou a escrita e vai recusar de novo.
 */
export type UpsertPunchResult = "applied" | "stale" | "duplicate_minute" | "failed" | "rejected";

/** Acesso às batidas: Supabase no app, versão em memória nos testes. */
export type Punches = {
  /** Batidas não excluídas do dia local, em qualquer ordem. */
  onDate: (date: LocalDate) => Promise<Punch[]>;
  /** Batidas não excluídas dos dias locais de `start` a `end`, inclusive. */
  between: (start: LocalDate, end: LocalDate) => Promise<Punch[]>;
  upsert: (write: PunchWrite) => Promise<UpsertPunchResult>;
};

export const PunchesContext = createContext<Punches | null>(null);

export function usePunches(): Punches {
  const punches = useContext(PunchesContext);
  if (!punches) throw new Error("usePunches precisa de um PunchesContext.Provider");
  return punches;
}

const punchesKey = (userId: string) => ["punches", userId];

/** Outbox do usuário da sessão, ao vivo; `undefined` enquanto o IndexedDB não respondeu. */
export function useQueuedPunches(): OutboxItem[] | undefined {
  const outbox = useOutbox();
  const user = useSignedInUser();
  return useLiveQuery(() => outbox.items(user.id), [outbox, user.id]);
}

/**
 * As batidas do servidor com as escritas da fila por cima, na ordem da fila; conflitos ficam de fora.
 * Da fila entram só as dos dias locais de `start` a `end`.
 */
function withQueue(
  server: Punch[],
  queue: OutboxItem[],
  start: LocalDate,
  end: LocalDate,
): Punch[] {
  const byId = new Map(server.map((punch) => [punch.id, punch]));
  for (const { write, conflict } of queue) {
    if (conflict) continue;
    byId.delete(write.id);
    const date = toLocalDate(write.punchedAt);
    if (!write.deletedAt && date >= start && date <= end) {
      byId.set(write.id, punchOf(write));
    }
  }
  return [...byId.values()];
}

/** Batidas do usuário da sessão no dia local `date`, já com o que está na fila do aparelho. */
export function usePunchesOn(date: LocalDate) {
  const punches = usePunches();
  const user = useSignedInUser();
  const queue = useQueuedPunches();
  const server = useQuery({
    queryKey: [...punchesKey(user.id), date],
    queryFn: () => punches.onDate(date),
  });
  // Sem conexão e sem o dia no cache, a consulta fica pausada: vale só o que está na fila.
  const serverPunches = server.data ?? (server.fetchStatus === "paused" ? [] : undefined);
  return {
    data: serverPunches && queue && withQueue(serverPunches, queue, date, date),
    isError: server.isError,
    refetch: server.refetch,
  };
}

/**
 * Batidas do usuário da sessão dos dias `start` a `end`, já com o que está na fila do aparelho.
 * `queueOnly`: sem conexão e sem esses dias no cache, `data` é só a fila (D3).
 */
export function usePunchesBetween(start: LocalDate, end: LocalDate) {
  const punches = usePunches();
  const user = useSignedInUser();
  const queue = useQueuedPunches();
  const server = useQuery({
    queryKey: [...punchesKey(user.id), start, end],
    queryFn: () => punches.between(start, end),
  });
  const queueOnly = !server.data && server.fetchStatus === "paused";
  const serverPunches = server.data ?? (queueOnly ? [] : undefined);
  return {
    data: serverPunches && queue && withQueue(serverPunches, queue, start, end),
    queueOnly,
    isError: server.isError,
    refetch: server.refetch,
  };
}

/** Grava a batida na outbox (D3): aparece na hora e sobe pela sincronização. */
export function useWritePunch() {
  const outbox = useOutbox();
  const user = useSignedInUser();
  return (write: PunchWrite): Promise<void> => outbox.enqueue(user.id, write);
}

/** Recarrega as batidas do usuário depois que a fila subiu. */
export function useRefreshPunches() {
  const user = useSignedInUser();
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: punchesKey(user.id) }),
    [queryClient, user.id],
  );
}
