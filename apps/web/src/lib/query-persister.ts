import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import type { OfflineDb } from "./offline-db";

const KEY = "tanstack-query";

/**
 * Persiste o cache do TanStack Query no IndexedDB (D3). O IndexedDB guarda por clone estruturado,
 * então as datas das batidas voltam como `Date`, sem serializar em JSON.
 */
export function createQueryPersister(db: OfflineDb): Persister {
  return {
    persistClient: async (client) => {
      await db.queryCache.put({ key: KEY, value: client });
    },
    restoreClient: async () => (await db.queryCache.get(KEY))?.value as PersistedClient | undefined,
    removeClient: async () => {
      await db.queryCache.delete(KEY);
    },
  };
}
