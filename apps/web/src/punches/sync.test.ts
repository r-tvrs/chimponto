import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineDb } from "@/lib/offline-db";
import { createOutbox } from "./outbox";
import type { DayMarkWrite, Punches, PunchWrite, UpsertPunchResult } from "./punches";
import { createPunchSync, retryDelayMs } from "./sync";

const USER = "user-a";
let dbCount = 0;
const dbs: OfflineDb[] = [];

function freshOutbox() {
  const db = new OfflineDb(`sync-test-${++dbCount}`);
  dbs.push(db);
  return createOutbox(db);
}

afterEach(async () => {
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

function write(id: string, time = "09:00"): PunchWrite {
  return {
    id,
    punchedAt: new Date(`2026-10-16T${time}:00-03:00`),
    source: "manual",
    note: null,
    updatedAt: new Date("2026-10-16T12:00:00Z"),
    deletedAt: null,
  };
}

/**
 * Servidor que responde, em ordem, os resultados dados; depois, `applied`, ou `duplicate_minute`
 * se outra batida já ocupa o minuto.
 */
function fakeServer(...results: UpsertPunchResult[]) {
  const rows = new Map<string, PunchWrite>();
  const upsert = vi.fn(async (w: PunchWrite): Promise<UpsertPunchResult> => {
    const taken = [...rows.values()].some(
      (row) => row.id !== w.id && row.punchedAt.getTime() === w.punchedAt.getTime(),
    );
    const result = results.shift() ?? (taken ? "duplicate_minute" : "applied");
    if (result === "applied") rows.set(w.id, w);
    return result;
  });
  const upsertMark = vi.fn<Punches["upsertMark"]>(async () => "applied");
  return { rows, upsert, upsertMark };
}

function startSync(
  outbox: ReturnType<typeof freshOutbox>,
  server: ReturnType<typeof fakeServer>,
  options: { online?: () => boolean; retryDelayMs?: (attempt: number) => number } = {},
) {
  const onSynced = vi.fn(async () => {});
  const sync = createPunchSync({
    outbox,
    upsert: server.upsert,
    upsertMark: server.upsertMark,
    userId: USER,
    isOnline: options.online ?? (() => true),
    onSynced,
    retryDelayMs: options.retryDelayMs ?? (() => 0),
  });
  return { sync, onSynced };
}

describe("punch sync", () => {
  it("sends the queue in order and empties it, refreshing the reads once", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    await outbox.enqueue(USER, write("b", "12:00"));
    const server = fakeServer();
    const { sync, onSynced } = startSync(outbox, server);

    await sync.run();

    expect(server.upsert.mock.calls.map(([w]) => w.id)).toEqual(["a", "b"]);
    expect(await outbox.items(USER)).toEqual([]);
    expect(onSynced).toHaveBeenCalledOnce();
  });

  it("sends the day marks through the same queue, in order with the punches", async () => {
    const outbox = freshOutbox();
    const mark: DayMarkWrite = {
      date: "2026-10-14",
      type: "atestado",
      note: null,
      updatedAt: new Date("2026-10-16T12:00:00Z"),
      deletedAt: null,
    };
    await outbox.enqueue(USER, write("a"));
    await outbox.enqueueMark(USER, mark);
    const server = fakeServer();
    const order: string[] = [];
    server.upsert.mockImplementation(async (w) => (order.push(w.id), "applied"));
    server.upsertMark.mockImplementation(async (m) => (order.push(m.date), "applied"));
    const { sync } = startSync(outbox, server);

    await sync.run();

    expect(order).toEqual(["a", "2026-10-14"]);
    expect(server.upsertMark).toHaveBeenCalledExactlyOnceWith(mark);
    expect(await outbox.items(USER)).toEqual([]);
  });

  it("drops a day mark the server rejects, without turning it into a conflict", async () => {
    const outbox = freshOutbox();
    await outbox.enqueueMark(USER, {
      date: "2026-10-14",
      type: "atestado",
      note: null,
      updatedAt: new Date("2026-10-16T12:00:00Z"),
      deletedAt: null,
    });
    await outbox.enqueue(USER, write("a"));
    const server = fakeServer("rejected");
    server.upsertMark.mockResolvedValueOnce("rejected");
    const { sync } = startSync(outbox, server);

    await sync.run();

    expect(await outbox.items(USER)).toEqual([
      expect.objectContaining({ write: write("a"), conflict: "rejected" }),
    ]);
  });

  it("sends every write of a punch edited while queued, so a minute it freed can be reused", async () => {
    const outbox = freshOutbox();
    const server = fakeServer();
    server.rows.set("a", write("a", "09:00"));
    await outbox.enqueue(USER, write("a", "09:10"));
    await outbox.enqueue(USER, write("b", "09:00"));
    await outbox.enqueue(USER, { ...write("a", "09:10"), note: "almoço" });
    const { sync } = startSync(outbox, server);

    await sync.run();

    expect(server.upsert.mock.calls.map(([w]) => w.id)).toEqual(["a", "b", "a"]);
    expect(await outbox.items(USER)).toEqual([]);
    expect(server.rows.get("a")?.note).toBe("almoço");
  });

  it("drops a conflicting write when a later write of the same punch is queued", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    await outbox.enqueue(USER, write("a", "09:05"));
    const server = fakeServer("duplicate_minute");
    const { sync } = startSync(outbox, server);

    await sync.run();

    expect(await outbox.items(USER)).toEqual([]);
    expect(server.rows.get("a")).toEqual(write("a", "09:05"));
  });

  it("drops a conflicting write when the punch is edited while it is being sent", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    const server = fakeServer("duplicate_minute");
    const send = server.upsert.getMockImplementation()!;
    server.upsert.mockImplementationOnce(async (w) => {
      await outbox.enqueue(USER, write("a", "09:05"));
      return send(w);
    });
    const { sync } = startSync(outbox, server);

    await sync.run();
    await sync.run();

    expect(await outbox.items(USER)).toEqual([]);
    expect(server.rows.get("a")).toEqual(write("a", "09:05"));
  });

  it("refreshes the reads when a pass only finds conflicts, to show the punch that took the minute", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const { sync, onSynced } = startSync(outbox, fakeServer("duplicate_minute"));

    await sync.run();

    expect(onSynced).toHaveBeenCalledOnce();
  });

  it("replaces a conflict with the new write of the same punch", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    await startSync(outbox, fakeServer("duplicate_minute")).sync.run();

    await outbox.enqueue(USER, write("a", "09:05"));

    expect(await outbox.items(USER)).toEqual([
      expect.objectContaining({ write: write("a", "09:05"), conflict: null }),
    ]);
  });

  it("leaves other users' queue alone", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue("user-b", write("b"));
    const server = fakeServer();
    const { sync } = startSync(outbox, server);

    await sync.run();

    expect(server.upsert).not.toHaveBeenCalled();
    expect(await outbox.items("user-b")).toHaveLength(1);
  });

  it("drops a stale write", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const { sync } = startSync(outbox, fakeServer("stale"));

    await sync.run();

    expect(await outbox.items(USER)).toEqual([]);
  });

  it("keeps a write whose minute is taken as a conflict, and goes on with the queue", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    await outbox.enqueue(USER, write("b", "12:00"));
    const server = fakeServer("duplicate_minute");
    const { sync } = startSync(outbox, server);

    await sync.run();
    await sync.run();

    expect(server.upsert.mock.calls.map(([w]) => w.id)).toEqual(["a", "b"]);
    expect(await outbox.items(USER)).toEqual([
      expect.objectContaining({ write: write("a", "09:00"), conflict: "duplicate_minute" }),
    ]);
  });

  it("keeps a write the server rejects as a conflict, without blocking the rest of the queue", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a", "09:00"));
    await outbox.enqueue(USER, write("b", "12:00"));
    const server = fakeServer("rejected");
    const delays = vi.fn(() => 0);
    const { sync } = startSync(outbox, server, { retryDelayMs: delays });

    await sync.run();

    expect(server.upsert.mock.calls.map(([w]) => w.id)).toEqual(["a", "b"]);
    expect(delays).not.toHaveBeenCalled();
    expect(await outbox.items(USER)).toEqual([
      expect.objectContaining({ write: write("a", "09:00"), conflict: "rejected" }),
    ]);
  });

  it("does not send while offline", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const server = fakeServer();
    const { sync } = startSync(outbox, server, { online: () => false });

    await sync.run();

    expect(server.upsert).not.toHaveBeenCalled();
    expect(await outbox.items(USER)).toHaveLength(1);
  });

  it("retries a failed send with growing delays, resending the same write", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const server = fakeServer("failed", "failed");
    const delays = vi.fn<(attempt: number) => number>(() => 0);
    const { sync } = startSync(outbox, server, { retryDelayMs: delays });

    await sync.run();
    await vi.waitFor(async () => expect(await outbox.items(USER)).toEqual([]));

    expect(delays.mock.calls.map(([attempt]) => attempt)).toEqual([0, 1]);
    expect(server.upsert.mock.calls).toEqual([[write("a")], [write("a")], [write("a")]]);
    expect(server.rows.size).toBe(1);
  });

  it("treats a thrown send as a failure", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const server = fakeServer();
    server.upsert.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { sync } = startSync(outbox, server);

    await sync.run();
    await vi.waitFor(async () => expect(await outbox.items(USER)).toEqual([]));

    expect(server.upsert).toHaveBeenCalledTimes(2);
  });

  it("stops retrying once stopped", async () => {
    const outbox = freshOutbox();
    await outbox.enqueue(USER, write("a"));
    const server = fakeServer("failed");
    const { sync } = startSync(outbox, server, { retryDelayMs: () => 20 });

    await sync.run();
    sync.stop();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(server.upsert).toHaveBeenCalledOnce();
  });
});

describe("retryDelayMs", () => {
  it("doubles from 1 s up to 1 min", () => {
    expect([0, 1, 2, 5, 6, 10].map(retryDelayMs)).toEqual([
      1_000, 2_000, 4_000, 32_000, 60_000, 60_000,
    ]);
  });
});
