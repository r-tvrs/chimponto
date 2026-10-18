import { describe, expect, it, vi } from "vitest";
import { supabase } from "@/lib/supabase";
import type { PunchWrite } from "./punches";
import { supabasePunches } from "./supabase-punches";

vi.mock("@/lib/supabase", () => ({ supabase: { rpc: vi.fn() } }));

const write: PunchWrite = {
  id: "a",
  punchedAt: new Date("2026-10-16T09:00:00-03:00"),
  source: "manual",
  note: null,
  updatedAt: new Date("2026-10-16T12:00:00Z"),
  deletedAt: null,
};

function respond(status: number, data: string | null = null) {
  const error = data === null ? { message: "erro sintético" } : null;
  vi.mocked(supabase.rpc).mockResolvedValueOnce({ data, error, status } as never);
}

describe("supabasePunches.upsert", () => {
  it("returns what upsert_punch answered", async () => {
    respond(200, "duplicate_minute");

    expect(await supabasePunches.upsert(write)).toBe("duplicate_minute");
  });

  it.each([0, 401, 408, 429, 500, 503])(
    "treats status %i as a failure to retry",
    async (status) => {
      respond(status);

      expect(await supabasePunches.upsert(write)).toBe("failed");
    },
  );

  it.each([400, 403, 404, 409])("treats status %i as a rejection", async (status) => {
    respond(status);

    expect(await supabasePunches.upsert(write)).toBe("rejected");
  });
});
