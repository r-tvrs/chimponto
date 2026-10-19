import { onlineManager } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useSignedInUser } from "@/auth/auth";
import { useOutbox } from "./outbox";
import { usePunches, useQueuedPunches, useRefreshPunches } from "./punches";
import { createPunchSync, type PunchSync as Sync } from "./sync";

/**
 * Mantém a outbox subindo enquanto há sessão (D3): ao abrir o app, quando a conexão volta e a
 * cada escrita nova na fila. Não desenha nada.
 */
export function PunchSync() {
  const outbox = useOutbox();
  const { upsert, upsertMark } = usePunches();
  const user = useSignedInUser();
  const refresh = useRefreshPunches();
  const sync = useRef<Sync | null>(null);
  const lastSeq = useQueuedPunches()?.at(-1)?.seq;

  useEffect(() => {
    const created = createPunchSync({
      outbox,
      upsert,
      upsertMark,
      userId: user.id,
      isOnline: () => onlineManager.isOnline(),
      onSynced: refresh,
    });
    sync.current = created;
    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) void created.run();
    });
    void created.run();
    return () => {
      unsubscribe();
      created.stop();
    };
  }, [outbox, upsert, upsertMark, user.id, refresh]);

  // Cada escrita nova entra com um seq novo no fim da fila.
  useEffect(() => {
    if (lastSeq !== undefined) void sync.current?.run();
  }, [lastSeq]);

  return null;
}
