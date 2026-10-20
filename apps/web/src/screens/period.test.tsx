import { type CompanyRules, companyRulesSchema, fromLocal, toLocalDate } from "@chimponto/domain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Auth, AuthContext } from "@/auth/auth";
import { type Companies, CompaniesContext } from "@/company/company";
import { OfflineDb } from "@/lib/offline-db";
import { createOutbox, OutboxContext } from "@/punches/outbox";
import { type Punch, type Punches, PunchesContext, type SavedDayMark } from "@/punches/punches";
import { PeriodScreen } from "./period";

// Sexta, 16/10/2026: período atual 20/09 → 19/10.
const TODAY = "2026-10-16";

const auth: Auth = {
  state: { status: "signed_in", user: { id: "user-a", email: "marina@lumen.dev" } },
  requestMagicLink: async () => "sent",
  signOut: async () => "signed_out",
};

let seq = 0;
/** Batidas sintéticas de um dia local de São Paulo. */
function day(date: string, ...times: string[]): Punch[] {
  return times.map((time) => ({
    id: `p${++seq}`,
    punchedAt: fromLocal(date, time)!,
    source: "manual",
    note: null,
    updatedAt: new Date("2026-10-16T00:00:00Z"),
  }));
}

function fakePunches(rows: Punch[], marks: SavedDayMark[] = []): Punches {
  const inRange = (p: Punch, start: string, end: string) => {
    const date = toLocalDate(p.punchedAt);
    return date >= start && date <= end;
  };
  return {
    onDate: async (date) => rows.filter((p) => inRange(p, date, date)),
    between: vi.fn(async (start, end) => rows.filter((p) => inRange(p, start, end))),
    upsert: async () => "applied",
    marksBetween: async (start, end) => marks.filter((m) => m.date >= start && m.date <= end),
    upsertMark: async () => "applied",
  };
}

function fakeCompanies(rules: Partial<CompanyRules> = {}): Companies {
  return {
    membershipOf: async () => ({
      companyId: "company-1",
      companyName: "Lumen Software",
      role: "member",
      rules: companyRulesSchema.parse(rules),
    }),
    create: async () => "already_member",
    updateRules: async () => "failed",
  };
}

let dbCount = 0;
const dbs: OfflineDb[] = [];

function DayStub() {
  return <p>Tela Dia {useParams().date}</p>;
}

function renderPeriod(
  punches: Punch[],
  companies = fakeCompanies(),
  entry: { pathname: string; state?: unknown } = { pathname: "/periodo" },
  marks: SavedDayMark[] = [],
) {
  const db = new OfflineDb(`period-test-${++dbCount}`);
  dbs.push(db);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompaniesContext.Provider value={companies}>
          <PunchesContext.Provider value={fakePunches(punches, marks)}>
            <OutboxContext.Provider value={createOutbox(db)}>
              <MemoryRouter initialEntries={[entry]}>
                <Routes>
                  <Route path="/" element={<p>Tela Hoje</p>} />
                  <Route path="/periodo" element={<PeriodScreen />} />
                  <Route path="/periodo/:date" element={<DayStub />} />
                </Routes>
              </MemoryRouter>
            </OutboxContext.Provider>
          </PunchesContext.Provider>
        </CompaniesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fromLocal(TODAY, "14:28")!);
});

afterEach(async () => {
  vi.useRealTimers();
  cleanup();
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

describe("period selector", () => {
  it("opens on the current period and steps back to the previous ones", async () => {
    const user = renderPeriod([]);

    const selector = await screen.findByRole("group", { name: "Período" });
    expect(selector).toHaveTextContent("20 set → 19 out");
    expect(selector).toHaveTextContent("período atual · fecha em 3 dias");
    expect(within(selector).getByRole("button", { name: "Próximo período" })).toBeDisabled();

    await user.click(within(selector).getByRole("button", { name: "Período anterior" }));

    expect(selector).toHaveTextContent("20 ago → 19 set");
    expect(selector).toHaveTextContent("período fechado · pagamento em 1º out");

    await user.click(within(selector).getByRole("button", { name: "Próximo período" }));

    expect(selector).toHaveTextContent("20 set → 19 out");
  });
});

// Dias com almoço de 1h e o saldo pedido.
const weekPunches = [
  ...day("2026-10-13", "09:00", "12:00", "13:00", "18:40"), // ter +0h40
  ...day("2026-10-14", "09:00", "12:00", "13:00", "17:03"), // qua −0h57
  ...day("2026-10-10", "09:00", "11:00"), // sáb +2h00
  ...day("2026-10-11", "10:00", "11:30"), // dom +1h30
  ...day("2026-10-15", "09:00", "12:00", "13:00"), // qui, falta a saída
];

describe("period summary", () => {
  it("shows the net balance, the overtime by kind, the deficit and the pending days", async () => {
    renderPeriod(weekPunches);

    const summary = await screen.findByRole("region", { name: "Saldo do período" });
    expect(within(summary).getByLabelText("mais 3 horas e 13 minutos")).toHaveTextContent("+3h13");
    expect(within(summary).getByRole("img")).toHaveAccessibleName(
      "Bolota comemorando com um cacho de bananas",
    );
    expect(within(summary).getByRole("group", { name: "Horas extras" })).toHaveTextContent("+4h10");
    expect(within(summary).getByRole("group", { name: "Débito" })).toHaveTextContent("−0h57");
    // Dias úteis passados sem batidas: 21/09–09/10 (15) + 12/10; mais o 15/10 incompleto.
    expect(within(summary).getByRole("group", { name: "Pendências" })).toHaveTextContent("17");
    expect(summary).toHaveTextContent("Dia útil +0h40 · Sábado +2h00 · Domingo/feriado +1h30");
  });

  it("compensates within the period when the company says so", async () => {
    renderPeriod(weekPunches, fakeCompanies({ compensateWithinPeriod: true }));

    const summary = await screen.findByRole("region", { name: "Saldo do período" });
    expect(within(summary).getByRole("group", { name: "Horas extras" })).toHaveTextContent("+3h13");
    expect(within(summary).getByRole("group", { name: "Débito" })).toHaveTextContent("±0h00");
    expect(summary).toHaveTextContent("Dia útil +1h43 · Domingo/feriado +1h30");
  });

  it("worries when the balance is negative", async () => {
    renderPeriod(day("2026-10-14", "09:00", "12:00", "13:00", "17:03"));

    const summary = await screen.findByRole("region", { name: "Saldo do período" });
    expect(within(summary).getByRole("img")).toHaveAccessibleName(
      "Bolota preocupada, correndo atrasada",
    );
  });
});

/** A linha do dia na lista, pelo rótulo "sex, 16 out". */
function row(label: string) {
  return within(screen.getByRole("list", { name: "Dias do período" })).getByRole("listitem", {
    name: label,
  });
}

describe("day list", () => {
  const punches = [
    ...day("2026-10-13", "09:00", "12:00", "13:00", "18:40"), // completo
    ...day("2026-10-14", "09:00", "12:00", "12:40", "18:20"), // almoço curto
    ...day("2026-10-15", "09:00", "12:00", "13:00"), // ímpar
    ...day("2026-10-09", "09:00", "18:00"), // sem almoço
    ...day("2026-10-16", "09:02", "13:28"), // hoje
  ];

  it("lists the days from the newest, grouped by month", async () => {
    renderPeriod(punches);

    const list = await screen.findByRole("list", { name: "Dias do período" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(30);
    expect(items[0]).toHaveAccessibleName("seg, 19 out");
    expect(items.at(-1)).toHaveAccessibleName("dom, 20 set");
    expect(
      within(list)
        .getAllByRole("heading")
        .map((h) => h.textContent),
    ).toEqual(["outubro", "setembro"]);
  });

  it.each([
    ["sex, 16 out", "Hoje", "em andamento"],
    ["qui, 15 out", "3 batidas", "incompleto"],
    ["qua, 14 out", "Almoço curto", "8h40"],
    ["seg, 12 out", "Sem registro", "—"],
    ["sex, 9 out", "Sem almoço", "incompleto"],
  ])("marks %s with the badge %s", async (label, badge, worked) => {
    renderPeriod(punches);
    await screen.findByRole("list", { name: "Dias do período" });

    expect(row(label)).toHaveTextContent(badge);
    expect(row(label)).toHaveTextContent(worked);
  });

  it.each([
    ["falta", "Falta", "bg-negative/12"],
    ["atestado", "Atestado", "bg-muted"],
    ["ferias", "Férias", "bg-muted"],
    ["folga_compensada", "Folga", "bg-muted"],
    ["abono", "Abono", "bg-muted"],
    ["feriado", "Feriado", "bg-muted"],
  ] as const)("marks a day of type %s with the badge %s", async (type, text, tone) => {
    const mark = { date: "2026-10-12", type, note: null, updatedAt: new Date() };
    renderPeriod([], fakeCompanies(), undefined, [mark]);
    await screen.findByRole("list", { name: "Dias do período" });

    const badge = row("seg, 12 out").querySelector("[data-slot=badge]");
    expect(badge).toHaveTextContent(text);
    expect(badge).toHaveClass(tone);
    expect(row("seg, 12 out")).not.toHaveTextContent("Sem registro");
  });

  it("says 1 batida, in the singular, for a day with a single punch", async () => {
    renderPeriod(day("2026-10-15", "09:00"));
    await screen.findByRole("list", { name: "Dias do período" });

    expect(row("qui, 15 out")).toHaveTextContent("1 batida");
    expect(row("qui, 15 out")).not.toHaveTextContent("1 batidas");
  });

  it("shows a complete day with its balance and no badge, and dims the days ahead", async () => {
    renderPeriod(punches);
    await screen.findByRole("list", { name: "Dias do período" });

    expect(row("ter, 13 out")).toHaveTextContent("8h40");
    expect(within(row("ter, 13 out")).getByLabelText("mais 0 horas e 40 minutos")).toBeVisible();
    expect(row("ter, 13 out").querySelector("[data-slot=badge]")).toBeNull();
    expect(row("sáb, 17 out")).toHaveTextContent("ainda não chegou");
    expect(row("sáb, 17 out")).toHaveClass("opacity-55");
    expect(row("dom, 11 out")).toHaveTextContent("sem jornada");
  });

  it("filters the days left to resolve", async () => {
    const user = renderPeriod(punches);
    await screen.findByRole("list", { name: "Dias do período" });

    // 21/09–08/10 sem registro (14), 12/10 sem registro, 9 e 15/10 incompletos.
    await user.click(screen.getByRole("tab", { name: "Pendências (17)" }));

    const items = within(screen.getByRole("list", { name: "Dias do período" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(17);
    expect(items[0]).toHaveAccessibleName("qui, 15 out");
    expect(screen.queryByRole("listitem", { name: "sex, 16 out" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Todos os dias" }));

    expect(screen.getAllByRole("listitem")).toHaveLength(30);
  });

  it("goes to Hoje from today's row", async () => {
    const user = renderPeriod(punches);

    await user.click(await screen.findByRole("link", { name: /sex, 16 out/ }));

    expect(screen.getByText("Tela Hoje")).toBeVisible();
  });

  it("opens Dia from a past day's row", async () => {
    const user = renderPeriod(punches);

    await user.click(await screen.findByRole("link", { name: /qui, 15 out/ }));

    expect(screen.getByText("Tela Dia 2026-10-15")).toBeVisible();
  });

  it("leaves the days ahead untappable", async () => {
    renderPeriod(punches);

    const ahead = await screen.findByRole("listitem", { name: "sáb, 17 out" });
    expect(within(ahead).queryByRole("link")).not.toBeInTheDocument();
  });

  it("comes back from Dia on the period of that day", async () => {
    renderPeriod(punches, fakeCompanies(), { pathname: "/periodo", state: { date: "2026-09-15" } });

    const selector = await screen.findByRole("group", { name: "Período" });
    expect(selector).toHaveTextContent("20 ago → 19 set");
  });
});
