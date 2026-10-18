import { QueryClient } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from "@tanstack/react-query-persist-client";
import { afterEach, expect, it } from "vitest";
import { OfflineDb } from "./offline-db";
import { createQueryPersister } from "./query-persister";

const db = new OfflineDb("query-persister-test");

afterEach(async () => {
  await db.delete();
  await db.open();
});

it("restores the cached reads in a new session, dates included", async () => {
  const persister = createQueryPersister(db);
  const punches = [{ id: "a", punchedAt: new Date("2026-10-16T09:00:00-03:00") }];
  const before = new QueryClient();
  before.setQueryData(["punches", "2026-10-16"], punches);

  await persistQueryClientSave({ queryClient: before, persister });
  const after = new QueryClient();
  await persistQueryClientRestore({ queryClient: after, persister });

  expect(after.getQueryData(["punches", "2026-10-16"])).toEqual(punches);
});
