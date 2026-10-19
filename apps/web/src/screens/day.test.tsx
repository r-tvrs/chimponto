import {
  type CompanyRules,
  companyRulesSchema,
  fromLocal,
  toLocalDate,
  toLocalTime,
} from "@chimponto/domain";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Auth, AuthContext } from "@/auth/auth";
import { type Companies, CompaniesContext } from "@/company/company";
import { ToastProvider } from "@/components/toast";
import { OfflineDb } from "@/lib/offline-db";
import { createOutbox, type Outbox, OutboxContext } from "@/punches/outbox";
import { type Punch, type Punches, PunchesContext } from "@/punches/punches";
import { DayScreen } from "./day";
import { PeriodScreen } from "./period";

// Sexta, 16/10/2026; a tela abre a quarta, 14/10, no período 20/09 → 19/10.
const TODAY = "2026-10-16";
const DAY = "2026-10-14";

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
    updatedAt: new Date("2026-10-15T00:00:00Z"),
  }));
}

function fakePunches(rows: Punch[]): Punches {
  const inRange = (p: Punch, start: string, end: string) => {
    const date = toLocalDate(p.punchedAt);
    return date >= start && date <= end;
  };
  return {
    onDate: async (date) => rows.filter((p) => inRange(p, date, date)),
    between: async (start, end) => rows.filter((p) => inRange(p, start, end)),
    upsert: async () => "applied",
  };
}

function fakeCompanies(rules: Partial<CompanyRules> = {}): Companies {
  return {
    membershipOf: async () => ({
      companyId: "company-1",
      role: "member",
      rules: companyRulesSchema.parse(rules),
    }),
    create: async () => "already_member",
  };
}

let dbCount = 0;
const dbs: OfflineDb[] = [];

/** Período de mentira; tocar no texto é o voltar do sistema (uma entrada atrás no histórico). */
function PeriodStub() {
  const navigate = useNavigate();
  return <button onClick={() => void navigate(-1)}>Tela Período</button>;
}

/**
 * Abre o Dia de `date` por cima de outra tela (aqui a Hoje), para ver o que fica no histórico. Com
 * `viaPeriod`, abre o Período de verdade, de onde o teste toca no dia. O servidor lê `punches` a
 * cada consulta: mudar a lista e invalidar as consultas é a leitura nova de outro aparelho.
 */
function renderDay(
  punches: Punch[],
  {
    date = DAY,
    outboxOf = createOutbox,
    serverOf = fakePunches,
    viaPeriod = false,
  }: {
    date?: string;
    outboxOf?: (db: OfflineDb) => Outbox;
    serverOf?: (rows: Punch[]) => Punches;
    viaPeriod?: boolean;
  } = {},
): { user: ReturnType<typeof userEvent.setup>; outbox: Outbox; queryClient: QueryClient } {
  const db = new OfflineDb(`day-test-${++dbCount}`);
  dbs.push(db);
  const outbox = outboxOf(db);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompaniesContext.Provider value={fakeCompanies()}>
          <PunchesContext.Provider value={serverOf(punches)}>
            <OutboxContext.Provider value={outbox}>
              <ToastProvider>
                <MemoryRouter
                  initialEntries={viaPeriod ? ["/periodo"] : ["/", `/periodo/${date}`]}
                  initialIndex={viaPeriod ? 0 : 1}
                >
                  <Routes>
                    <Route path="/" element={<p>Tela Hoje</p>} />
                    <Route
                      path="/periodo"
                      element={viaPeriod ? <PeriodScreen /> : <PeriodStub />}
                    />
                    <Route path="/periodo/:date" element={<DayScreen />} />
                  </Routes>
                </MemoryRouter>
              </ToastProvider>
            </OutboxContext.Provider>
          </PunchesContext.Provider>
        </CompaniesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), outbox, queryClient };
}

beforeEach(() => {
  // Só o Date: o IndexedDB falso e o userEvent precisam dos timers reais.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fromLocal(TODAY, "14:28")!);
});

afterEach(async () => {
  onlineManager.setOnline(true);
  vi.useRealTimers();
  cleanup();
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

const punchesCard = () => screen.findByRole("group", { name: "Batidas" });

describe("day screen", () => {
  it("shows the period, the date, the alerts and one row per punch, padded to a full day", async () => {
    renderDay(day(DAY, "09:00", "12:00", "13:00"));

    expect(await screen.findByRole("heading", { name: "qua, 14 out" })).toBeInTheDocument();
    expect(screen.getByText("Período 20 set → 19 out")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Principal" })).not.toBeInTheDocument();
    expect(await screen.findByText("3 batidas")).toBeInTheDocument();

    const card = await punchesCard();
    expect(within(card).getByLabelText("Entrada")).toHaveValue("09:00");
    expect(within(card).getByLabelText("Saída almoço")).toHaveValue("12:00");
    expect(within(card).getByLabelText("Volta almoço")).toHaveValue("13:00");
    expect(within(card).getByLabelText("Saída")).toHaveValue("");
  });

  it("recalculates the labels, the alerts and the tiles live while editing", async () => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00"));
    const card = await punchesCard();
    const worked = screen.getByRole("group", { name: "Trabalhadas" });
    const balance = screen.getByRole("group", { name: "Saldo do dia" });
    expect(worked).toHaveTextContent("3h00");
    expect(balance).toHaveTextContent("—");

    await user.type(within(card).getByLabelText("Saída"), "17:00");

    expect(screen.queryByText("3 batidas")).not.toBeInTheDocument();
    expect(worked).toHaveTextContent("7h00");
    expect(balance).toHaveTextContent("−1h00");

    // A volta às 12:20 vira almoço curto; o rótulo segue a hora, não a linha.
    const lunchReturn = within(card).getByLabelText("Volta almoço");
    await user.clear(lunchReturn);
    await user.type(lunchReturn, "12:20");

    expect(screen.getByText("Almoço de 20 min")).toBeInTheDocument();
    expect(balance).toHaveTextContent("−0h20");
  });

  it("adds and removes punches, with 5+ punches valid when the count is even", async () => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00", "18:00"));
    const card = await punchesCard();
    const balance = screen.getByRole("group", { name: "Saldo do dia" });
    expect(balance).toHaveTextContent("±0h00");

    await user.click(screen.getByRole("button", { name: "Adicionar batida" }));
    await user.type(within(card).getByLabelText("Saída extra"), "19:00");

    expect(screen.getByText("5 batidas")).toBeInTheDocument();
    expect(balance).toHaveTextContent("—");

    await user.click(screen.getByRole("button", { name: "Adicionar batida" }));
    await user.type(within(card).getByLabelText("Retorno extra"), "19:30");

    expect(screen.queryByText(/batidas$/)).not.toBeInTheDocument();
    expect(balance).toHaveTextContent("+0h30");

    // Sem a das 19:00, a das 19:30 passa a ser a saída extra.
    await user.click(within(card).getByRole("button", { name: "Remover Saída extra" }));
    expect(within(card).getByLabelText("Saída extra")).toHaveValue("19:30");
    await user.click(within(card).getByRole("button", { name: "Remover Saída extra" }));

    expect(within(card).getAllByRole("button", { name: /^Remover/ })).toHaveLength(4);
    expect(balance).toHaveTextContent("±0h00");
  });

  it("blocks two punches in the same minute", async () => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00"));
    const card = await punchesCard();
    const save = screen.getByRole("button", { name: "Salvar dia" });

    await user.type(within(card).getByLabelText("Saída"), "13:00");

    expect(within(card).getAllByText("Já tem uma batida às 13:00.")).toHaveLength(2);
    expect(save).toBeDisabled();

    await user.clear(within(card).getAllByDisplayValue("13:00")[1]!);
    await user.type(within(card).getByLabelText("Saída"), "18:00");

    expect(within(card).queryByText(/Já tem uma batida/)).not.toBeInTheDocument();
    expect(save).toBeEnabled();
  });

  it("saves the changes through the outbox and goes back to the period with a toast", async () => {
    const saved = day(DAY, "09:00", "11:00", "12:00", "13:00");
    const { user, outbox } = renderDay(saved);
    const card = await punchesCard();

    // A das 11:00 foi engano; a volta foi às 13:05 e faltava a saída.
    await user.click(within(card).getByRole("button", { name: "Remover Saída almoço" }));
    const lunchReturn = within(card).getByDisplayValue("13:00");
    await user.clear(lunchReturn);
    await user.type(lunchReturn, "13:05");
    await user.click(screen.getByRole("button", { name: "Adicionar batida" }));
    await user.type(within(card).getByLabelText("Saída"), "18:00");
    await user.click(screen.getByRole("button", { name: "Salvar dia" }));

    expect(await screen.findByText("Tela Período")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Dia 14 salvo");

    const writes = (await outbox.items("user-a")).map(({ write }) => write);
    expect(writes).toHaveLength(3);
    const [removed, edited, added] = writes;
    expect(removed).toMatchObject({ id: saved[1]!.id, punchedAt: fromLocal(DAY, "11:00") });
    expect(removed!.deletedAt).not.toBeNull();
    expect(edited).toMatchObject({
      id: saved[3]!.id,
      punchedAt: fromLocal(DAY, "13:05"),
      deletedAt: null,
    });
    expect(added).toMatchObject({
      punchedAt: fromLocal(DAY, "18:00"),
      source: "manual",
      note: null,
      deletedAt: null,
    });
    expect(saved.map((p) => p.id)).not.toContain(added!.id);
  });

  it("sends a chain of edits so that each one finds its minute free on the server", async () => {
    const saved = day(DAY, "09:00", "12:00", "13:00", "18:00");
    const { user, outbox } = renderDay(saved);
    const card = await punchesCard();

    // O almoço foi uma hora depois: a volta vai para 14:00 e a saída para o minuto que ela deixou.
    const lunchReturn = within(card).getByDisplayValue("13:00");
    await user.clear(lunchReturn);
    await user.type(lunchReturn, "14:00");
    const lunchOut = within(card).getByDisplayValue("12:00");
    await user.clear(lunchOut);
    await user.type(lunchOut, "13:00");
    await user.click(screen.getByRole("button", { name: "Salvar dia" }));

    expect(await screen.findByText("Tela Período")).toBeInTheDocument();
    const writes = (await outbox.items("user-a")).map(({ write }) => [
      write.id,
      toLocalTime(write.punchedAt),
    ]);
    expect(writes).toEqual([
      [saved[2]!.id, "14:00"],
      [saved[1]!.id, "13:00"],
    ]);
  });

  it.each([
    ["the back button", () => screen.findByRole("link", { name: "Voltar" })],
    ["Salvar dia", () => screen.findByRole("button", { name: "Salvar dia" })],
  ])("goes back to the period with %s, leaving the day out of the history", async (_, exit) => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00", "18:00"));
    await punchesCard();

    await user.click(await exit());
    await user.click(await screen.findByText("Tela Período"));

    expect(await screen.findByText("Tela Hoje")).toBeInTheDocument();
  });

  it("stays on the day, with the changes, when the device can't store them", async () => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00"), {
      outboxOf: (db) => ({
        ...createOutbox(db),
        enqueue: () => Promise.reject(new Error("QuotaExceededError")),
      }),
    });
    const card = await punchesCard();
    const save = screen.getByRole("button", { name: "Salvar dia" });

    await user.type(within(card).getByLabelText("Saída"), "18:00");
    await user.click(save);

    expect(
      await screen.findByText("Não deu para salvar o dia. Tente de novo."),
    ).toBeInTheDocument();
    expect(save).toBeEnabled();
    expect(within(card).getByLabelText("Saída")).toHaveValue("18:00");
  });

  it("saves nothing for punches left as they were", async () => {
    const { user, outbox } = renderDay(day(DAY, "09:00", "12:00", "13:00", "18:00"));
    await punchesCard();

    await user.click(screen.getByRole("button", { name: "Salvar dia" }));

    expect(await screen.findByText("Tela Período")).toBeInTheDocument();
    expect(await outbox.items("user-a")).toEqual([]);
  });

  it("saves offline into the outbox and says it stays on the device", async () => {
    const { user, outbox } = renderDay(day(DAY, "09:00", "12:00", "13:00"));
    const card = await punchesCard();
    act(() => onlineManager.setOnline(false));

    await user.type(within(card).getByLabelText("Saída"), "18:00");
    await user.click(screen.getByRole("button", { name: "Salvar dia" }));

    expect(await screen.findByText("Tela Período")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Salvo no aparelho. Sobe quando o sinal voltar.",
    );
    expect(await outbox.items("user-a")).toHaveLength(1);
  });

  it.each([
    [TODAY, "Tela Hoje"],
    ["2026-10-17", "Tela Período"],
    ["2026-02-30", "Tela Período"],
  ])("sends %s elsewhere: %s", async (date, target) => {
    renderDay([], { date });
    expect(await screen.findByText(target)).toBeInTheDocument();
  });

  it("opens offline with the punches the period already showed", async () => {
    const { user } = renderDay(day(DAY, "09:00", "12:00", "13:00"), { viaPeriod: true });
    const row = await screen.findByRole("link", { name: "qua, 14 out, abrir o dia" });

    // O sinal cai depois de o Período carregar; o Dia nunca foi aberto com conexão.
    act(() => onlineManager.setOnline(false));
    await user.click(row);

    const card = await punchesCard();
    expect(within(card).getByLabelText("Entrada")).toHaveValue("09:00");
    expect(within(card).getByLabelText("Volta almoço")).toHaveValue("13:00");
    expect(screen.getByText("3 batidas")).toBeInTheDocument();
  });

  it("waits for the connection when the day is not on the device", async () => {
    const { user } = renderDay(day("2026-09-15", "09:00", "12:00", "13:00", "18:00"), {
      viaPeriod: true,
    });
    const selector = await screen.findByRole("group", { name: "Período" });

    // Sem sinal, num período que o aparelho nunca baixou.
    act(() => onlineManager.setOnline(false));
    await user.click(within(selector).getByRole("button", { name: "Período anterior" }));
    await user.click(await screen.findByRole("link", { name: "ter, 15 set, abrir o dia" }));

    expect(await screen.findByText("Sem sinal na selva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar dia" })).not.toBeInTheDocument();

    act(() => onlineManager.setOnline(true));

    const card = await punchesCard();
    expect(within(card).getByLabelText("Entrada")).toHaveValue("09:00");
    expect(screen.queryByText("Sem sinal na selva")).not.toBeInTheDocument();
  });

  it("says it could not open the day when the first read fails", async () => {
    renderDay(day(DAY, "09:00"), {
      serverOf: (rows) => ({
        ...fakePunches(rows),
        between: () => Promise.reject(new Error("rede")),
      }),
    });

    expect(await screen.findByText("Não deu para abrir o dia")).toBeInTheDocument();
  });

  it("keeps the editor and the changes when a later read fails", async () => {
    let down = false;
    const { user, queryClient } = renderDay(day(DAY, "09:00", "12:00", "13:00"), {
      serverOf: (rows) => {
        const server = fakePunches(rows);
        return {
          ...server,
          between: (start, end) =>
            down ? Promise.reject(new Error("rede")) : server.between(start, end),
        };
      },
    });
    const card = await punchesCard();
    await user.type(within(card).getByLabelText("Saída"), "18:00");

    // O sinal volta fraco e a releitura falha; o usuário segue editando.
    down = true;
    await act(() => queryClient.invalidateQueries());
    const lunchReturn = within(card).getByLabelText("Volta almoço");
    await user.clear(lunchReturn);
    await user.type(lunchReturn, "13:05");

    expect(screen.queryByText("Não deu para abrir o dia")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Volta almoço")).toHaveValue("13:05");
    expect(screen.getByLabelText("Saída")).toHaveValue("18:00");
  });

  it("saves only what the user changed when the saved punches change after the first edit", async () => {
    const rows = day(DAY, "09:00", "12:00", "13:00", "18:00");
    const [, lunchOut, lunchReturn, exit] = rows;
    const { user, outbox, queryClient } = renderDay(rows);
    const card = await punchesCard();

    const exitInput = within(card).getByLabelText("Saída");
    await user.clear(exitInput);
    await user.type(exitInput, "18:30");
    // Enquanto isso, outro aparelho excluiu a saída do almoço e moveu a volta para 13:05.
    rows.splice(rows.indexOf(lunchOut!), 1);
    rows[rows.indexOf(lunchReturn!)] = { ...lunchReturn!, punchedAt: fromLocal(DAY, "13:05")! };
    await act(() => queryClient.invalidateQueries());
    await user.click(screen.getByRole("button", { name: "Salvar dia" }));

    expect(await screen.findByText("Tela Período")).toBeInTheDocument();
    const writes = (await outbox.items("user-a")).map(({ write }) => [
      write.id,
      toLocalTime(write.punchedAt),
    ]);
    expect(writes).toEqual([[exit!.id, "18:30"]]);
  });

  it("says 1 batida, in the singular, for a day with a single punch", async () => {
    renderDay(day(DAY, "09:00"));

    expect(await screen.findByText("1 batida")).toBeInTheDocument();
  });

  it("follows the saved punches until the first edit", async () => {
    const { user, outbox } = renderDay(day(DAY, "09:00", "12:00"));
    const card = await punchesCard();

    // A batida que ainda estava subindo chega depois de a tela abrir.
    const [late] = day(DAY, "13:00");
    await act(() => outbox.enqueue("user-a", { ...late!, deletedAt: null }));

    expect(await within(card).findByDisplayValue("13:00")).toHaveAccessibleName("Volta almoço");

    await user.type(within(card).getByLabelText("Saída"), "18:00");
    const [later] = day(DAY, "20:00");
    await act(() => outbox.enqueue("user-a", { ...later!, deletedAt: null }));

    expect(within(card).queryByDisplayValue("20:00")).not.toBeInTheDocument();
  });
});
