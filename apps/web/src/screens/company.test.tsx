import { companyRulesSchema } from "@chimponto/domain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RequireCompany, RequireNoCompany, RequireSession } from "@/app/guards";
import { type Auth, AuthContext } from "@/auth/auth";
import {
  type Companies,
  CompaniesContext,
  type CreateCompanyResult,
  type Membership,
} from "@/company/company";
import { CompanyScreen } from "./company";

const auth: Auth = {
  state: { status: "signed_in", user: { id: "user-a", email: "marina@lumen.dev" } },
  requestMagicLink: async () => "sent",
  verifyCode: async () => "signed_in",
  signInWithPassword: async () => "signed_in",
  signOut: async () => "signed_out",
};

/**
 * Empresas em memória: começa com `membership` (null = sem empresa). Cada criação usa a próxima
 * resposta (padrão "created"); "created" e "already_member" deixam o usuário com empresa.
 */
function fakeCompanies(membership: Membership | null, ...createResults: CreateCompanyResult[]) {
  let current = membership;
  return {
    membershipOf: vi.fn<Companies["membershipOf"]>(async () => current),
    create: vi.fn<Companies["create"]>(async (name) => {
      const result = createResults.shift() ?? "created";
      if (result !== "failed")
        current = {
          companyId: "company-1",
          companyName: name,
          role: "admin",
          rules: companyRulesSchema.parse({}),
        };
      return result;
    }),
    updateRules: vi.fn<Companies["updateRules"]>(async () => "failed"),
  } satisfies Companies;
}

async function fillAndContinue(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(await screen.findByLabelText("Nome da empresa"), name);
  await user.click(screen.getByRole("button", { name: "Continuar" }));
}

function renderApp({ at, companies }: { at: string; companies: Companies }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompaniesContext.Provider value={companies}>
          <MemoryRouter initialEntries={[at]}>
            <Routes>
              <Route
                path="/"
                element={
                  <RequireSession>
                    <RequireCompany>
                      <h1>Hoje</h1>
                    </RequireCompany>
                  </RequireSession>
                }
              />
              <Route
                path="/empresa"
                element={
                  <RequireSession>
                    <RequireNoCompany>
                      <CompanyScreen />
                    </RequireNoCompany>
                  </RequireSession>
                }
              />
            </Routes>
          </MemoryRouter>
        </CompaniesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("company guard", () => {
  it("sends who has no company yet to the Empresa screen", async () => {
    renderApp({ at: "/", companies: fakeCompanies(null) });

    expect(await screen.findByRole("heading", { name: "Onde você trabalha?" })).toBeVisible();
  });

  it("never shows the Empresa screen to who already has a company", async () => {
    renderApp({
      at: "/empresa",
      companies: fakeCompanies({
        companyId: "company-1",
        companyName: "Lumen Software",
        role: "admin",
        rules: companyRulesSchema.parse({}),
      }),
    });

    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Onde você trabalha?" })).not.toBeInTheDocument();
  });

  it("shows the generic error when the company can't be loaded, and retries on demand", async () => {
    const companies = fakeCompanies({
      companyId: "company-1",
      companyName: "Lumen Software",
      role: "admin",
      rules: companyRulesSchema.parse({}),
    });
    companies.membershipOf.mockRejectedValueOnce(new Error("offline"));
    const user = renderApp({ at: "/", companies });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Não deu para abrir sua empresa");
    expect(alert).toHaveTextContent("Confira a conexão e tente de novo.");

    await user.click(within(alert).getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeVisible();
  });
});

describe("<CompanyScreen>", () => {
  it("offers only to create a company, with the default daily hours filled in", async () => {
    renderApp({ at: "/empresa", companies: fakeCompanies(null) });

    expect(await screen.findByLabelText("Nome da empresa")).toHaveValue("");
    expect(screen.getByLabelText("Jornada diária")).toHaveValue("8h00");
    expect(screen.getByText("Criar empresa")).toBeVisible();
    expect(screen.queryByText("Tenho um convite")).not.toBeInTheDocument();
  });

  it("creates the company with the name, the daily hours and the default rules, then opens Hoje", async () => {
    const companies = fakeCompanies(null);
    const user = renderApp({ at: "/empresa", companies });

    await user.type(await screen.findByLabelText("Nome da empresa"), "  Lumen Software ");
    await user.clear(screen.getByLabelText("Jornada diária"));
    await user.type(screen.getByLabelText("Jornada diária"), "8h48");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeVisible();
    expect(companies.create).toHaveBeenCalledExactlyOnceWith(
      "Lumen Software",
      expect.objectContaining({
        dailyMinutes: 528,
        workdays: ["mon", "tue", "wed", "thu", "fri"],
        expectedLunchMinutes: 60,
        closingDay: 19,
      }),
    );
  });

  it("flags a blank name on the field without creating the company", async () => {
    const companies = fakeCompanies(null);
    const user = renderApp({ at: "/empresa", companies });

    await user.type(await screen.findByLabelText("Nome da empresa"), "   ");
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const field = screen.getByLabelText("Nome da empresa");
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription("Digite o nome da empresa.");
    expect(screen.getByLabelText("Jornada diária")).toBeValid();
    expect(companies.create).not.toHaveBeenCalled();
  });

  it.each([
    ["unreadable", "8h5"],
    ["zero", "0h00"],
    ["longer than a day", "24h01"],
  ])("flags daily hours that are %s without creating the company", async (_, dailyHours) => {
    const companies = fakeCompanies(null);
    const user = renderApp({ at: "/empresa", companies });

    await user.type(await screen.findByLabelText("Nome da empresa"), "Lumen Software");
    await user.clear(screen.getByLabelText("Jornada diária"));
    await user.type(screen.getByLabelText("Jornada diária"), dailyHours);
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    const field = screen.getByLabelText("Jornada diária");
    expect(field).toBeInvalid();
    expect(field).toHaveAccessibleDescription("Digite a jornada como 8h00.");
    expect(screen.getByLabelText("Nome da empresa")).toBeValid();
    expect(companies.create).not.toHaveBeenCalled();
  });

  it("blocks a second request while the company is being created", async () => {
    const companies = fakeCompanies(null);
    companies.create.mockReturnValue(new Promise<never>(() => {}));
    const user = renderApp({ at: "/empresa", companies });

    await fillAndContinue(user, "Lumen Software");

    expect(screen.getByRole("button", { name: "Criando…" })).toBeDisabled();
  });

  it("shows the generic error when the company can't be created, and retries on demand", async () => {
    const companies = fakeCompanies(null, "failed", "created");
    const user = renderApp({ at: "/empresa", companies });

    await fillAndContinue(user, "Lumen Software");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Não deu para criar a empresa");
    expect(alert).toHaveTextContent("Confira a conexão e tente de novo.");

    await user.click(within(alert).getByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeVisible();
    expect(companies.create).toHaveBeenCalledTimes(2);
    expect(companies.create).toHaveBeenLastCalledWith(
      "Lumen Software",
      expect.objectContaining({ dailyMinutes: 480 }),
    );
  });

  it("opens Hoje when the user already got a company elsewhere, e.g. in another tab", async () => {
    const user = renderApp({ at: "/empresa", companies: fakeCompanies(null, "already_member") });

    await fillAndContinue(user, "Lumen Software");

    expect(await screen.findByRole("heading", { name: "Hoje" })).toBeVisible();
  });
});
