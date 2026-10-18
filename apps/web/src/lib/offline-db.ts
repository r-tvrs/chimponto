import Dexie, { type EntityTable } from "dexie";
import type { OutboxItem } from "@/punches/outbox";

/** Cache de leitura do TanStack Query, guardado inteiro numa chave. */
type CacheEntry = { key: string; value: unknown };

/** Banco local do aparelho (D3): outbox das batidas e cache de leitura. */
export class OfflineDb extends Dexie {
  outbox!: EntityTable<OutboxItem, "seq">;
  queryCache!: EntityTable<CacheEntry, "key">;

  constructor(name = "chimponto") {
    super(name);
    this.version(1).stores({ outbox: "++seq, userId, [userId+punchId]", queryCache: "key" });
  }
}
