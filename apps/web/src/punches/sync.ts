import type { Outbox } from "./outbox";
import type { Punches } from "./punches";

/** Espera antes da tentativa `attempt` (0, 1, …) depois de uma falha: 1 s dobrando até 1 min. */
export function retryDelayMs(attempt: number): number {
  return Math.min(1_000 * 2 ** attempt, 60_000);
}

export type PunchSync = {
  /** Envia a fila agora; resolve quando a passada termina (sucesso, offline ou falha agendada). */
  run: () => Promise<void>;
  stop: () => void;
};

/**
 * Drena a outbox do usuário pelo `upsert_punch`, em ordem (D3). `applied` e `stale` saem da fila
 * depois de `onSynced` recarregar as leituras, para a batida não sumir da tela no meio do caminho;
 * `duplicate_minute` e `rejected` viram conflito e a fila segue, a não ser que uma escrita mais nova
 * da mesma batida esteja na fila (aí saem); toda passada com resposta do servidor recarrega as
 * leituras; `failed` (rede) para a passada e tenta de novo com backoff.
 */
export function createPunchSync({
  outbox,
  upsert,
  userId,
  isOnline,
  onSynced,
  retryDelayMs: delayOf = retryDelayMs,
}: {
  outbox: Outbox;
  upsert: Punches["upsert"];
  userId: string;
  isOnline: () => boolean;
  onSynced: () => Promise<void>;
  retryDelayMs?: (attempt: number) => number;
}): PunchSync {
  let running: Promise<void> | null = null;
  let again = false;
  let attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  /** Uma passada pela fila; `false` se parou numa falha. */
  async function pass(): Promise<boolean> {
    const done: number[] = [];
    let answered = false;
    let failed = false;
    for (const item of await outbox.items(userId)) {
      if (item.conflict) continue;
      if (stopped || !isOnline()) break;
      const result = await upsert(item.write).catch(() => "failed" as const);
      if (result === "failed") {
        failed = true;
        break;
      }
      attempt = 0;
      answered = true;
      if (result === "duplicate_minute" || result === "rejected") {
        await outbox.markConflictUnlessSuperseded(item, result);
      } else done.push(item.seq);
    }
    // Também depois de só conflitos: a leitura nova traz a batida que tomou o minuto.
    if (answered) await onSynced();
    if (done.length > 0) await outbox.remove(done);
    return !failed;
  }

  async function drain() {
    do {
      again = false;
      if (!(await pass())) {
        if (!stopped) retry = setTimeout(() => void run(), delayOf(attempt++));
        return;
      }
    } while (again && !stopped);
  }

  function run(): Promise<void> {
    if (stopped) return Promise.resolve();
    clearTimeout(retry);
    if (running) {
      again = true;
      return running;
    }
    running = drain().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    run,
    stop: () => {
      stopped = true;
      clearTimeout(retry);
    },
  };
}
