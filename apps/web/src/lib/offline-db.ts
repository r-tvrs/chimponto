import Dexie, { type EntityTable, type InsertType } from "dexie";
import type { OutboxItem, QueuedDayMark, QueuedPunch } from "@/punches/outbox";

/** Cache de leitura do TanStack Query, guardado inteiro numa chave. */
type CacheEntry = { key: string; value: unknown };

/** Banco local do aparelho (D3): outbox das batidas e marcações e cache de leitura. */
export class OfflineDb extends Dexie {
  // InsertType por membro: o `Omit` do Dexie não distribui sobre a união.
  outbox!: EntityTable<
    OutboxItem,
    "seq",
    InsertType<QueuedPunch, "seq"> | InsertType<QueuedDayMark, "seq">
  >;
  queryCache!: EntityTable<CacheEntry, "key">;

  constructor(name = "chimponto") {
    super(name);
    this.version(1).stores({ outbox: "++seq, userId, [userId+punchId]", queryCache: "key" });
  }
}
