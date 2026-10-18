import { type CompanyRules, companyRulesSchema, fromLocal, toLocalDate } from "@chimponto/domain";
import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Auth, AuthContext } from "@/auth/auth";
import { type Companies, CompaniesContext } from "@/company/company";
import { ToastProvider } from "@/components/toast";
import { OfflineDb } from "@/lib/offline-db";
import { createOutbox, type Outbox, OutboxContext } from "@/punches/outbox";
import { PunchSync } from "@/punches/punch-sync";
import {
  type Punch,
  type Punches,
  PunchesContext,
  type PunchWrite,
  type UpsertPunchResult,
} from "@/punches/punches";
import { TodayScreen } from "./today";

// O perfil vem direto do Supabase; aqui só importa o avatar não quebrar.
vi.mock("@/data/profile", () => ({ useProfile: () => ({ data: { display_name: "Marina" } }) }));

// Sexta-feira: dia de jornada com as regras padrão.
const TODAY = "2026-10-16";
const SATURDAY = "2026-10-17";

const auth: Auth = {
  state: { status: "signed_in", user: { id: "user-a", email: "marina@lumen.dev" } },
  requestMagicLink: async () => "sent",
  signOut: async () => "signed_out",
};

function punch(time: string, id = `p-${time}`, date = TODAY): Punch {
  return {
    id,
    punchedAt: fromLocal(date, time)!,
    source: "manual",
    note: null,
    updatedAt: new Date("2026-10-16T00:00:00Z"),
  };
}

/**
 * Batidas em memória, com a regra de uma batida por minuto do servidor. `failNextWith` força a
 * resposta da próxima escrita (por exemplo, "failed" ou um `duplicate_minute` de outro aparelho).
 */
function fakePunches(initial: Punch[]) {
  const rows = new Map<string, PunchWrite>(initial.map((p) => [p.id, { ...p, deletedAt: null }]));
  const live = () => [...rows.values()].filter((p) => p.deletedAt === null);
  let forced: UpsertPunchResult | null = null;
  return {
    failNextWith: (result: UpsertPunchResult) => {
      forced = result;
    },
    onDate: vi.fn<Punches["onDate"]>(async (date) =>
      live().filter((p) => toLocalDate(p.punchedAt) === date),
    ),
    upsert: vi.fn<Punches["upsert"]>(async (write) => {
      const result = forced;
      forced = null;
      if (result) return result;
      // Como o índice único parcial do banco: outra batida viva no mesmo instante (já sem segundos).
      const taken = live().some(
        (p) => p.id !== write.id && p.punchedAt.getTime() === write.punchedAt.getTime(),
      );
      if (!write.deletedAt && taken) {
        return "duplicate_minute";
      }
      rows.set(write.id, write);
      return "applied";
    }),
  } satisfies Punches & { failNextWith: unknown };
}

/** Empresa do usuário com as regras padrão de docs/02 §1, ou as `rules` dadas. */
function fakeCompanies(rules: Partial<CompanyRules> = {}): Companies {
  return {
    membershipOf: async () => ({
      companyId: "company-1",
      role: "admin",
      rules: companyRulesSchema.parse(rules),
    }),
    create: async () => "already_member",
  };
}

let dbCount = 0;
const dbs: OfflineDb[] = [];

/** Outbox num banco IndexedDB novo (fake-indexeddb), para cada teste começar com a fila vazia. */
function freshOutbox(): Outbox {
  const db = new OfflineDb(`today-test-${++dbCount}`);
  dbs.push(db);
  return createOutbox(db);
}

function renderToday(punches: Punches, companies = fakeCompanies(), outbox = freshOutbox()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompaniesContext.Provider value={companies}>
          <PunchesContext.Provider value={punches}>
            <OutboxContext.Provider value={outbox}>
              <PunchSync />
              <ToastProvider>
                <MemoryRouter>
                  <TodayScreen />
                </MemoryRouter>
              </ToastProvider>
            </OutboxContext.Provider>
          </PunchesContext.Provider>
        </CompaniesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

/** Corta ou devolve a conexão, como os eventos `offline`/`online` do navegador. */
function setOnline(online: boolean) {
  act(() => onlineManager.setOnline(online));
}

/** Linhas do card Batidas como "rótulo hora", na ordem da tela. */
async function rows() {
  const card = await screen.findByRole("region", { name: "Batidas" });
  return within(card)
    .getAllByRole("button")
    .map((row) => row.getAttribute("aria-label"));
}

/** Abre o sheet pelo CTA, que só habilita depois de carregar as batidas e a fila. */
async function openPunchSheet(user: ReturnType<typeof userEvent.setup>) {
  const cta = await screen.findByRole("button", { name: /Bater ponto/ });
  await vi.waitFor(() => expect(cta).toBeEnabled());
  await user.click(cta);
}

async function setTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  const field = within(screen.getByRole("dialog")).getByLabelText("Hora");
  await user.clear(field);
  await user.type(field, time);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(fromLocal(TODAY, "14:28")!);
});

afterEach(async () => {
  vi.useRealTimers();
  onlineManager.setOnline(true);
  cleanup();
  await Promise.all(dbs.splice(0).map((db) => db.delete()));
});

describe("Batidas card", () => {
  it("shows the generic error when the punches can't be loaded, and retries on demand", async () => {
    const punches = fakePunches([punch("09:02")]);
    punches.onDate.mockRejectedValueOnce(new Error("offline"));
    const user = renderToday(punches);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Não deu para abrir suas batidas");
    expect(alert).toHaveTextContent("Confira a conexão e tente de novo.");

    await user.click(within(alert).getByRole("button", { name: "Tentar de novo" }));

    expect(await rows()).toContain("Editar Entrada, 09:02");
  });

  it("lists the day's punches as done, the next one and the future ones, with the counter", async () => {
    renderToday(fakePunches([punch("13:28"), punch("09:02")]));

    expect(await rows()).toEqual([
      "Editar Entrada, 09:02",
      "Editar Saída almoço, 13:28",
      "Bater Volta almoço",
      "Bater Saída",
    ]);
    const card = screen.getByRole("region", { name: "Batidas" });
    expect(within(card).getByText("2 de 4")).toBeVisible();
    expect(within(card).getByText("próxima batida")).toBeVisible();
    expect(screen.getByRole("button", { name: /Bater ponto/ })).toHaveTextContent(
      "volta do almoço",
    );
  });

  it("counts every punch when an even day goes past 4", async () => {
    renderToday(
      fakePunches(["08:00", "12:00", "13:00", "14:00", "14:10", "14:20"].map((t) => punch(t))),
    );

    expect(await rows()).toHaveLength(6);
    const card = screen.getByRole("region", { name: "Batidas" });
    expect(within(card).getByText("6 de 6")).toBeVisible();
    expect(screen.getByRole("button", { name: /Dia completo · 6 de 6 batidas/ })).toBeEnabled();
  });

  it("shows the forecast time of the pending punches", async () => {
    vi.setSystemTime(fromLocal(TODAY, "14:21")!);
    renderToday(fakePunches([punch("09:02"), punch("13:28")]));

    const card = await screen.findByRole("region", { name: "Batidas" });
    expect(within(card).getByRole("button", { name: "Bater Volta almoço" })).toHaveTextContent(
      "prev. 14:28",
    );
    expect(within(card).getByRole("button", { name: "Bater Saída" })).toHaveTextContent(
      "prev. 18:02",
    );
  });
});

describe("Próximo card", () => {
  it("shows the expected lunch return and how long until it", async () => {
    vi.setSystemTime(fromLocal(TODAY, "14:21")!);
    renderToday(fakePunches([punch("09:02"), punch("13:28")]));

    const card = await screen.findByRole("region", { name: "Próximo" });
    expect(within(card).getByRole("heading")).toHaveTextContent("Volta do almoço às 14:28");
    expect(card).toHaveTextContent("em 7 min · almoço de 1h");
  });

  it("shows the expected exit after the real lunch", async () => {
    vi.setSystemTime(fromLocal(TODAY, "15:08")!);
    renderToday(fakePunches([punch("09:03"), punch("13:00"), punch("14:05")]));

    const card = await screen.findByRole("region", { name: "Próximo" });
    expect(within(card).getByRole("heading")).toHaveTextContent("Saída às 18:08");
    expect(card).toHaveTextContent("em 3h · jornada de 8h");
  });

  it("says when the expected time has passed", async () => {
    vi.setSystemTime(fromLocal(TODAY, "14:30")!);
    renderToday(fakePunches([punch("09:02"), punch("13:28")]));

    expect(await screen.findByRole("region", { name: "Próximo" })).toHaveTextContent(
      "há 2 min · almoço de 1h",
    );
  });

  it("follows the clock while the screen stays open", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(fromLocal(TODAY, "14:21")!);
    renderToday(fakePunches([punch("09:02"), punch("13:28")]));
    const card = await screen.findByRole("region", { name: "Próximo" });

    act(() => vi.advanceTimersByTime(2 * 60_000));

    expect(card).toHaveTextContent("em 5 min");
  });

  it("names a free punch without a time", async () => {
    vi.setSystemTime(fromLocal(TODAY, "10:00")!);
    renderToday(fakePunches([punch("09:02")]));

    const card = await screen.findByRole("region", { name: "Próximo" });
    expect(within(card).getByRole("heading")).toHaveTextContent("Saída para o almoço");
    expect(card).toHaveTextContent("almoço de 1h");
  });

  it("closes the day with the balance and the complete CTA", async () => {
    vi.setSystemTime(fromLocal(TODAY, "18:31")!);
    renderToday(fakePunches(["09:03", "13:00", "14:05", "18:30"].map((t) => punch(t))));

    const card = await screen.findByRole("region", { name: "Dia fechado" });
    expect(within(card).getByRole("heading")).toHaveTextContent("Saldo do dia +0h22");
    expect(card).toHaveTextContent("Bom descanso. Amanhã tem mais galho.");
    expect(screen.queryByRole("button", { name: /Bater ponto/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dia completo · 4 de 4 batidas/ })).toBeEnabled();
  });

  it("lets a closed day take an extra punch, like a doctor's visit", async () => {
    vi.setSystemTime(fromLocal(TODAY, "18:31")!);
    const user = renderToday(
      fakePunches(["09:03", "13:00", "14:05", "18:30"].map((t) => punch(t))),
    );

    await user.click(await screen.findByRole("button", { name: /Dia completo · 4 de 4 batidas/ }));

    const sheet = screen.getByRole("dialog", { name: "Bater ponto" });
    expect(sheet).toHaveTextContent("Vai entrar como saída extra");
  });
});

describe("day tiles", () => {
  it("shows the worked hours against the company's journey, with the balance still open", async () => {
    renderToday(
      fakePunches([punch("09:02"), punch("13:28")]),
      fakeCompanies({ dailyMinutes: 528 }),
    );

    const worked = await screen.findByRole("group", { name: "Trabalhadas" });
    expect(worked).toHaveTextContent("4h26");
    expect(worked).toHaveTextContent("de 8h48");
    const balance = screen.getByRole("group", { name: "Saldo do dia" });
    expect(balance).toHaveTextContent("—");
    expect(balance).toHaveTextContent("fecha na saída");
  });

  it("shows the balance with the tolerance once the day closes", async () => {
    vi.setSystemTime(fromLocal(TODAY, "18:20")!);
    renderToday(fakePunches(["09:00", "12:00", "13:00", "18:10"].map((t) => punch(t))));

    const balance = await screen.findByRole("group", { name: "Saldo do dia" });
    expect(within(balance).getByLabelText("0 horas e 0 minutos")).toHaveTextContent("±0h00");
    expect(balance).toHaveTextContent("jornada 8h00");
  });

  it("counts every minute on a day without a journey", async () => {
    vi.setSystemTime(fromLocal(SATURDAY, "12:00")!);
    renderToday(
      fakePunches(["09:00", "10:00", "10:30", "10:35"].map((t) => punch(t, t, SATURDAY))),
    );

    expect(await screen.findByRole("group", { name: "Trabalhadas" })).toHaveTextContent(
      "sem jornada",
    );
    expect(screen.getByRole("group", { name: "Saldo do dia" })).toHaveTextContent("+1h05");
  });
});

describe("day alerts", () => {
  it("warns about a short lunch", async () => {
    vi.setSystemTime(fromLocal(TODAY, "15:00")!);
    renderToday(fakePunches([punch("09:02"), punch("13:28"), punch("14:21")]));

    expect(await screen.findByText("Almoço de 53 min · o mínimo é 1h")).toBeVisible();
  });

  it("asks for the lunch on a day with only entry and exit", async () => {
    vi.setSystemTime(fromLocal(TODAY, "18:30")!);
    renderToday(fakePunches([punch("09:00"), punch("18:00")]));

    expect(await screen.findByText("Falta registrar o almoço")).toBeVisible();
    expect(screen.getByRole("group", { name: "Saldo do dia" })).toHaveTextContent("dia incompleto");
  });
});

describe("Bater ponto sheet", () => {
  it("opens with today's date and the current time, and saves the punch with a themed toast", async () => {
    const punches = fakePunches([punch("09:02"), punch("13:28")]);
    const user = renderToday(punches);

    await openPunchSheet(user);

    const sheet = screen.getByRole("dialog", { name: "Bater ponto" });
    expect(within(sheet).getByLabelText("Data")).toHaveValue(TODAY);
    expect(within(sheet).getByLabelText("Hora")).toHaveValue("14:28");
    expect(sheet).toHaveTextContent("Vai entrar como volta do almoço");

    await user.type(within(sheet).getByPlaceholderText("Observação (opcional)"), " Dentista ");
    await user.click(within(sheet).getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "De volta ao galho! Volta às 14:28.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await rows()).toContain("Editar Volta almoço, 14:28");
    await vi.waitFor(() => expect(punches.upsert).toHaveBeenCalled());
    expect(punches.upsert).toHaveBeenCalledExactlyOnceWith({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-7/),
      punchedAt: fromLocal(TODAY, "14:28"),
      source: "manual",
      note: "Dentista",
      updatedAt: expect.any(Date),
      deletedAt: null,
    });
  });

  it("recalculates the label it will take on every change of time and date", async () => {
    const user = renderToday(fakePunches([punch("09:02"), punch("13:28")]));
    await openPunchSheet(user);
    const sheet = screen.getByRole("dialog");

    await setTime(user, "08:30");
    expect(sheet).toHaveTextContent("Vai entrar como entrada");

    await setTime(user, "11:00");
    expect(sheet).toHaveTextContent("Vai entrar como saída para o almoço");

    const date = within(sheet).getByLabelText("Data");
    await user.clear(date);
    await user.type(date, "2026-10-15");
    expect(sheet).toHaveTextContent("Vai entrar como entrada");
  });

  it.each([
    ["08:00", "Bom dia! Entrada às 08:00."],
    ["11:00", "Bom almoço! Saída às 11:00."],
  ])("greets a punch at %s with its own toast", async (time, toast) => {
    const user = renderToday(fakePunches([punch("09:02"), punch("13:28")]));
    await openPunchSheet(user);

    await setTime(user, time);
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent(toast);
  });

  it("says goodbye on the exit", async () => {
    const user = renderToday(fakePunches([punch("09:02"), punch("13:28"), punch("14:28")]));
    await openPunchSheet(user);

    await setTime(user, "18:05");
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Até amanhã! Saída às 18:05.");
  });

  it("blocks a punch in the same minute as another one", async () => {
    const punches = fakePunches([punch("09:02"), punch("13:28")]);
    const user = renderToday(punches);
    await openPunchSheet(user);

    await setTime(user, "13:28");

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Já tem uma batida às 13:28.");
    expect(within(sheet).getByRole("button", { name: "Salvar batida" })).toBeDisabled();
    expect(punches.upsert).not.toHaveBeenCalled();
  });

  it("opens for the next punch from a pending row", async () => {
    const user = renderToday(fakePunches([punch("09:02")]));

    await user.click(await screen.findByRole("button", { name: "Bater Saída" }));

    const sheet = screen.getByRole("dialog", { name: "Bater ponto" });
    expect(within(sheet).getByLabelText("Hora")).toHaveValue("14:28");
    expect(sheet).toHaveTextContent("Vai entrar como saída para o almoço");
  });
});

describe("Bater ponto sheet live warnings", () => {
  it("warns about a short lunch with the expected return", async () => {
    vi.setSystemTime(fromLocal(TODAY, "14:21")!);
    const user = renderToday(fakePunches([punch("09:02"), punch("13:28")]));
    await openPunchSheet(user);

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Almoço de 53 min. O mínimo é 1h; volta prevista às 14:28.",
    );

    await setTime(user, "14:28");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Almoço de");
  });

  it.each([
    ["18:30", "Com essa saída, o saldo do dia fica +0h22."],
    ["17:30", "Com essa saída, o saldo do dia fica −0h38."],
    ["18:08", "Com essa saída, o saldo do dia fica ±0h00."],
  ])("gives the day's balance with an exit at %s", async (time, text) => {
    const user = renderToday(fakePunches([punch("09:03"), punch("13:00"), punch("14:05")]));
    await openPunchSheet(user);

    await setTime(user, time);

    expect(screen.getByRole("dialog")).toHaveTextContent(text);
  });

  it("calls it a punch, not an exit, when a doctor's return closes the day", async () => {
    vi.setSystemTime(fromLocal(TODAY, "18:40")!);
    const user = renderToday(
      fakePunches(["09:03", "13:00", "14:05", "15:00", "18:30"].map((t) => punch(t))),
    );
    await openPunchSheet(user);

    await setTime(user, "16:00");

    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Com essa batida, o saldo do dia fica −0h38.",
    );
  });
});

describe("editing a punch", () => {
  it("changes the time of a done punch", async () => {
    const punches = fakePunches([punch("09:02", "entry-id"), punch("13:28")]);
    const user = renderToday(punches);

    await user.click(await screen.findByRole("button", { name: "Editar Entrada, 09:02" }));
    const sheet = screen.getByRole("dialog", { name: "Editar batida" });
    expect(within(sheet).getByLabelText("Hora")).toHaveValue("09:02");
    expect(sheet).toHaveTextContent("Vai ficar como entrada");

    await setTime(user, "09:10");
    await user.click(within(sheet).getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Batida das 09:10 salva.");
    expect(await rows()).toContain("Editar Entrada, 09:10");
    await vi.waitFor(() => expect(punches.upsert).toHaveBeenCalled());
    expect(punches.upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "entry-id", punchedAt: fromLocal(TODAY, "09:10") }),
    );
  });

  it("lets the edited punch keep its own minute", async () => {
    const user = renderToday(fakePunches([punch("09:02"), punch("13:28")]));

    await user.click(await screen.findByRole("button", { name: "Editar Entrada, 09:02" }));

    const sheet = screen.getByRole("dialog");
    expect(within(sheet).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Salvar batida" })).toBeEnabled();
  });

  it("deletes a punch after confirming, as a soft delete", async () => {
    const punches = fakePunches([punch("09:02", "entry-id"), punch("13:28")]);
    const user = renderToday(punches);

    await user.click(await screen.findByRole("button", { name: "Editar Entrada, 09:02" }));
    await user.click(screen.getByRole("button", { name: "Excluir batida" }));
    const confirm = screen.getByRole("alertdialog", { name: "Excluir a batida das 09:02?" });
    await user.click(within(confirm).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Batida excluída.");
    expect(await rows()).toEqual([
      "Editar Entrada, 13:28",
      "Bater Saída almoço",
      "Bater Volta almoço",
      "Bater Saída",
    ]);
    await vi.waitFor(() => expect(punches.upsert).toHaveBeenCalled());
    expect(punches.upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ id: "entry-id", deletedAt: expect.any(Date) }),
    );
  });

  it("keeps the punch when the deletion is canceled", async () => {
    const punches = fakePunches([punch("09:02")]);
    const user = renderToday(punches);

    await user.click(await screen.findByRole("button", { name: "Editar Entrada, 09:02" }));
    await user.click(screen.getByRole("button", { name: "Excluir batida" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("dialog", { name: "Editar batida" })).toBeVisible();
    expect(punches.upsert).not.toHaveBeenCalled();
  });
});

describe("offline", () => {
  it("shows the offline banner and the offline Bolota, with no pill while the queue is empty", async () => {
    renderToday(fakePunches([punch("09:02")]));
    await rows();
    expect(screen.queryByRole("region", { name: "Sem sinal na selva" })).not.toBeInTheDocument();

    setOnline(false);

    const banner = screen.getByRole("region", { name: "Sem sinal na selva" });
    expect(banner).toHaveTextContent(
      "Suas batidas ficam salvas aqui e sobem quando a conexão voltar.",
    );
    expect(
      within(screen.getByRole("region", { name: "Próximo" })).getByRole("img"),
    ).toHaveAccessibleName("Bolota pendurada no cipó, sem sinal");
    expect(screen.queryByText(/na fila/)).not.toBeInTheDocument();
  });

  it("saves a punch on the device, shows it right away and queues it", async () => {
    const punches = fakePunches([punch("09:02"), punch("13:28")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);

    await user.click(screen.getByRole("button", { name: /Bater ponto/ }));
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Salvo no aparelho. Sobe quando o sinal voltar.",
    );
    expect(await rows()).toContain("Editar Volta almoço, 14:28");
    expect(await screen.findByText("Offline · 1 na fila")).toBeVisible();
    expect(punches.upsert).not.toHaveBeenCalled();
  });

  it("queues edits and deletions too", async () => {
    const punches = fakePunches([punch("09:02", "entry-id"), punch("13:28", "lunch-id")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);

    await user.click(screen.getByRole("button", { name: "Editar Entrada, 09:02" }));
    await setTime(user, "09:10");
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));
    await user.click(await screen.findByRole("button", { name: "Editar Saída almoço, 13:28" }));
    await user.click(screen.getByRole("button", { name: "Excluir batida" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Excluir" }),
    );

    expect(await screen.findByText("Offline · 2 na fila")).toBeVisible();
    expect(await rows()).toEqual([
      "Editar Entrada, 09:10",
      "Bater Saída almoço",
      "Bater Volta almoço",
      "Bater Saída",
    ]);
    expect(punches.upsert).not.toHaveBeenCalled();
  });

  it("sends the queue when the connection comes back, and the pill goes away", async () => {
    const punches = fakePunches([punch("09:02")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);
    await user.click(screen.getByRole("button", { name: /Bater ponto/ }));
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));
    await screen.findByText("Offline · 1 na fila");

    setOnline(true);

    await vi.waitFor(() => expect(screen.queryByText(/na fila/)).not.toBeInTheDocument());
    expect(punches.upsert).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ punchedAt: fromLocal(TODAY, "14:28") }),
    );
    expect(screen.queryByRole("region", { name: "Sem sinal na selva" })).not.toBeInTheDocument();
    expect(await rows()).toContain("Editar Saída almoço, 14:28");
  });

  it("punches on a day not in the cache, when the day turns over offline", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(fromLocal(TODAY, "18:00")!);
    const punches = fakePunches([punch("09:02")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);

    vi.setSystemTime(fromLocal("2026-10-19", "08:00")!);
    act(() => vi.advanceTimersByTime(30_000));
    await openPunchSheet(user);
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Salvo no aparelho. Sobe quando o sinal voltar.",
    );
    expect(await rows()).toContain("Editar Entrada, 08:00");
    expect(punches.onDate).not.toHaveBeenCalledWith("2026-10-19");
  });

  it("sends what was left in the queue when the app opens", async () => {
    const punches = fakePunches([]);
    const outbox = freshOutbox();
    await outbox.enqueue("user-a", { ...punch("09:02", "queued-id"), deletedAt: null });

    renderToday(punches, fakeCompanies(), outbox);

    await vi.waitFor(() =>
      expect(punches.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: "queued-id" })),
    );
    expect(await rows()).toContain("Editar Entrada, 09:02");
  });

  it("shows the pill without 'Offline' while online with a queue that fails to go up", async () => {
    const punches = fakePunches([]);
    punches.failNextWith("failed");
    const user = renderToday(punches);
    await openPunchSheet(user);
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Bom dia! Entrada às 14:28.");
    expect(await screen.findByText("1 na fila")).toBeVisible();
    expect(await rows()).toContain("Editar Entrada, 14:28");
  });

  it("drops a stale edit and shows the newer version from the server", async () => {
    const punches = fakePunches([punch("09:02", "entry-id")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);
    await user.click(screen.getByRole("button", { name: "Editar Entrada, 09:02" }));
    await setTime(user, "09:10");
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));
    expect(await rows()).toContain("Editar Entrada, 09:10");

    // Outro aparelho gravou uma versão mais nova da mesma batida, às 08:55.
    await punches.upsert({
      ...punch("08:55", "entry-id"),
      updatedAt: new Date("2030-01-01T00:00:00Z"),
      deletedAt: null,
    });
    punches.failNextWith("stale");
    setOnline(true);

    await vi.waitFor(() => expect(screen.queryByText(/na fila/)).not.toBeInTheDocument());
    expect(await rows()).toContain("Editar Entrada, 08:55");
  });
});

describe("punch in conflict", () => {
  /** Bate 14:28 offline; ao voltar, outro aparelho já tem uma batida nesse minuto. */
  async function conflictAt1428() {
    const punches = fakePunches([punch("09:02")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);
    await user.click(screen.getByRole("button", { name: /Bater ponto/ }));
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));
    await screen.findByText("Offline · 1 na fila");
    await punches.upsert({ ...punch("14:28", "other-device"), deletedAt: null });
    setOnline(true);
    const alert = await screen.findByRole("region", { name: "Batida não sincronizada" });
    return { punches, user, alert };
  }

  it("shows the punch the server refused out of the day's list, and not in the queue", async () => {
    const { alert } = await conflictAt1428();

    expect(alert).toHaveTextContent(
      "A batida das 14:28 não subiu: já tem uma nesse minuto em outro aparelho.",
    );
    await vi.waitFor(() => expect(screen.queryByText(/na fila/)).not.toBeInTheDocument());
    expect(await rows()).toEqual([
      "Editar Entrada, 09:02",
      "Editar Saída almoço, 14:28",
      "Bater Volta almoço",
      "Bater Saída",
    ]);
  });

  it("discards the refused punch", async () => {
    const { user, alert } = await conflictAt1428();

    await user.click(within(alert).getByRole("button", { name: "Descartar" }));

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Batida não sincronizada" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows a punch the server rejected for good, with only the option to discard", async () => {
    const punches = fakePunches([punch("09:02")]);
    const user = renderToday(punches);
    await rows();
    setOnline(false);
    await user.click(screen.getByRole("button", { name: /Bater ponto/ }));
    await user.click(screen.getByRole("button", { name: "Salvar batida" }));
    await screen.findByText("Offline · 1 na fila");
    punches.failNextWith("rejected");

    setOnline(true);

    const alert = await screen.findByRole("region", { name: "Batida não sincronizada" });
    expect(alert).toHaveTextContent("A batida das 14:28 não subiu: o servidor recusou.");
    expect(within(alert).queryByRole("button", { name: "Mudar a hora" })).not.toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByText(/na fila/)).not.toBeInTheDocument());

    await user.click(within(alert).getByRole("button", { name: "Descartar" }));

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Batida não sincronizada" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("sends the refused punch again with a new time", async () => {
    const { punches, user, alert } = await conflictAt1428();

    await user.click(within(alert).getByRole("button", { name: "Mudar a hora" }));
    const sheet = screen.getByRole("dialog", { name: "Editar batida" });
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Já tem uma batida às 14:28.");
    await setTime(user, "14:29");
    await user.click(within(sheet).getByRole("button", { name: "Salvar batida" }));

    await vi.waitFor(() =>
      expect(
        screen.queryByRole("region", { name: "Batida não sincronizada" }),
      ).not.toBeInTheDocument(),
    );
    await vi.waitFor(() =>
      expect(punches.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({ punchedAt: fromLocal(TODAY, "14:29") }),
      ),
    );
    expect(await rows()).toContain("Editar Volta almoço, 14:29");
  });
});
