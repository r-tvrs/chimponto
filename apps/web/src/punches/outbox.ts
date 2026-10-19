import { createContext, useContext } from "react";
import type { OfflineDb } from "@/lib/offline-db";
import type { DayMarkWrite, PunchWrite } from "./punches";

/** Escrita ainda não aceita pelo servidor (D3): de batida ou de marcação do dia, na mesma fila. */
export type OutboxItem = QueuedPunch | QueuedDayMark;

/**
 * Escrita de batida. `conflict`: o servidor respondeu `duplicate_minute` ou recusou a escrita
 * (`rejected`); fica parada até o usuário mudar a hora (só no `duplicate_minute`) ou descartar.
 */
export type QueuedPunch = {
  seq: number;
  userId: string;
  punchId: string;
  write: PunchWrite;
  conflict: OutboxConflict | null;
};

/** Escrita da marcação do dia; não tem conflito (o dia é a chave, e vale a mais nova). */
export type QueuedDayMark = { seq: number; userId: string; mark: DayMarkWrite; conflict: null };

export type OutboxConflict = "duplicate_minute" | "rejected";

export type Outbox = {
  /**
   * Põe a escrita no fim da fila. As escritas anteriores da mesma batida ficam, para o servidor ver
   * a mesma sequência que o aparelho; só um conflito dela sai, porque a escrita nova o resolve.
   */
  enqueue: (userId: string, write: PunchWrite) => Promise<void>;
  enqueueMark: (userId: string, mark: DayMarkWrite) => Promise<void>;
  /** Fila do usuário, em ordem, com os conflitos. */
  items: (userId: string) => Promise<OutboxItem[]>;
  remove: (seqs: number[]) => Promise<void>;
  /**
   * Marca o conflito, ou tira a escrita da fila se já há uma mais nova da mesma batida (editada
   * enquanto esta estava no ar). Numa transação só, para uma edição não cair entre a checagem e a
   * marcação.
   */
  markConflictUnlessSuperseded: (item: QueuedPunch, conflict: OutboxConflict) => Promise<void>;
};

export function createOutbox(db: OfflineDb): Outbox {
  return {
    enqueue: (userId, write) =>
      db.transaction("rw", db.outbox, async () => {
        await db.outbox
          .where({ userId, punchId: write.id })
          .filter((item) => item.conflict !== null)
          .delete();
        await db.outbox.add({ userId, punchId: write.id, write, conflict: null });
      }),
    enqueueMark: async (userId, mark) => {
      await db.outbox.add({ userId, mark, conflict: null });
    },
    // Sem `async`: o `useLiveQuery` acompanha a leitura do Dexie feita aqui dentro.
    items: (userId) => db.outbox.where({ userId }).sortBy("seq"),
    remove: (seqs) => db.outbox.bulkDelete(seqs),
    markConflictUnlessSuperseded: ({ seq, userId, punchId }, conflict) =>
      db.transaction("rw", db.outbox, async () => {
        const newer = await db.outbox
          .where({ userId, punchId })
          .filter((later) => later.seq > seq)
          .count();
        if (newer > 0) await db.outbox.delete(seq);
        else await db.outbox.update(seq, { conflict });
      }),
  };
}

export const OutboxContext = createContext<Outbox | null>(null);

export function useOutbox(): Outbox {
  const outbox = useContext(OutboxContext);
  if (!outbox) throw new Error("useOutbox precisa de um OutboxContext.Provider");
  return outbox;
}
