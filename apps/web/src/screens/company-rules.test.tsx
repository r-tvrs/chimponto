import { companyRulesSchema } from "@chimponto/domain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { type Auth, AuthContext } from "@/auth/auth";
import { type Companies, CompaniesContext, type Membership } from "@/company/company";
import { ToastProvider } from "@/components/toast";
import { CompanyRulesScreen } from "./company-rules";

const auth: Auth = {
  state: { status: "signed_in", user: { id: "user-a", email: "marina@lumen.dev" } },
  requestMagicLink: async () => "sent",
  verifyCode: async () => "signed_in",
  signInWithPassword: async () => "signed_in",
  signOut: async () => "signed_out",
};

/** Empresa em memória com as regras padrão; `updateRules` responde `result` e, se "saved", grava. */
function fakeCompanies(role: Membership["role"], result: "saved" | "failed" = "saved") {
  let membership: Membership = {
    companyId: "company-1",
    companyName: "Lumen Software",
    role,
    rules: companyRulesSchema.parse({}),
  };
  return {
    membershipOf: vi.fn<Companies["membershipOf"]>(async () => membership),
    create: vi.fn<Companies["create"]>(async () => "already_member"),
    updateRules: vi.fn<Companies["updateRules"]>(async (_, rules) => {
      if (result === "saved") membership = { ...membership, rules };
      return result;
    }),
  } satisfies Companies;
}

function renderRules(companies: Companies) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <CompaniesContext.Provider value={companies}>
          <ToastProvider>
            <MemoryRouter initialEntries={["/ajustes", "/ajustes/empresa"]} initialIndex={1}>
              <Routes>
                <Route path="/ajustes" element={<h1>Ajustes</h1>} />
                <Route path="/ajustes/empresa" element={<CompanyRulesScreen />} />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </CompaniesContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("<CompanyRulesScreen>", () => {
  it("shows every rule of the company with its current value", async () => {
    renderRules(fakeCompanies("admin"));

    expect(await screen.findByLabelText("Jornada diária")).toHaveValue("8h00");
    expect(screen.getByRole("checkbox", { name: "seg" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "sáb" })).not.toBeChecked();
    expect(screen.getByLabelText("Almoço esperado")).toHaveValue("1h00");
    expect(screen.getByText("Flexível")).toBeVisible();
    expect(screen.getByLabelText("Tolerância diária (min)")).toHaveValue("10");
    expect(screen.getByLabelText("Dia de fechamento")).toHaveValue("19");
    expect(screen.getByLabelText("Dia do pagamento")).toHaveValue("1");
    expect(screen.getByLabelText("Divisor de horas")).toHaveValue("200");
    expect(screen.getByLabelText("Extra em dia útil (%)")).toHaveValue("50");
    expect(screen.getByLabelText("Extra no sábado (%)")).toHaveValue("50");
    expect(screen.getByLabelText("Extra em domingo e feriado (%)")).toHaveValue("100");
    expect(screen.getByRole("switch", { name: "Compensar dentro do período" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "DSR sobre horas extras" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Falta desconta o DSR" })).toBeChecked();
  });

  it("lets the admin save the rules and goes back to Ajustes", async () => {
    const companies = fakeCompanies("admin");
    const user = renderRules(companies);

    const daily = await screen.findByLabelText("Jornada diária");
    await user.clear(daily);
    await user.type(daily, "8h48");
    await user.click(screen.getByRole("checkbox", { name: "sáb" }));
    const saturday = screen.getByLabelText("Extra no sábado (%)");
    await user.clear(saturday);
    await user.type(saturday, "75");
    await user.click(screen.getByRole("switch", { name: "Compensar dentro do período" }));
    await user.click(screen.getByRole("button", { name: "Salvar regras" }));

    expect(companies.updateRules).toHaveBeenCalledWith(
      "company-1",
      companyRulesSchema.parse({
        dailyMinutes: 528,
        workdays: ["mon", "tue", "wed", "thu", "fri", "sat"],
        overtimeRateSaturday: 0.75,
        compensateWithinPeriod: true,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Ajustes" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Regras da empresa salvas.");
  });

  it("shows the validation errors in pt-BR and doesn't save", async () => {
    const companies = fakeCompanies("admin");
    const user = renderRules(companies);

    const daily = await screen.findByLabelText("Jornada diária");
    await user.clear(daily);
    await user.type(daily, "25h");
    for (const day of ["seg", "ter", "qua", "qui", "sex"]) {
      await user.click(screen.getByRole("checkbox", { name: day }));
    }
    const payday = screen.getByLabelText("Dia do pagamento");
    await user.clear(payday);
    await user.type(payday, "30");
    await user.clear(screen.getByLabelText("Divisor de horas"));
    await user.click(screen.getByRole("button", { name: "Salvar regras" }));

    expect(daily).toHaveAccessibleDescription("Digite a jornada como 8h00, até 24h00.");
    expect(screen.getByText("Escolha pelo menos um dia.")).toBeVisible();
    expect(payday).toHaveAccessibleDescription("Escolha um dia de 1 a 28.");
    expect(screen.getByLabelText("Divisor de horas")).toHaveAccessibleDescription(
      "Digite um número inteiro maior que zero.",
    );
    expect(screen.getByLabelText("Dia de fechamento")).not.toHaveAttribute("aria-invalid", "true");
    expect(companies.updateRules).not.toHaveBeenCalled();
  });

  it("stays on the form with a toast when saving fails", async () => {
    const user = renderRules(fakeCompanies("admin", "failed"));

    await user.click(await screen.findByRole("button", { name: "Salvar regras" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Não deu para salvar as regras. Tente de novo.",
    );
    expect(screen.getByLabelText("Jornada diária")).toBeVisible();
  });

  it("shows the rules read-only to a member", async () => {
    renderRules(fakeCompanies("member"));

    expect(await screen.findByLabelText("Jornada diária")).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "seg" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "DSR sobre horas extras" })).toBeDisabled();
    expect(screen.getByText("Só o admin da empresa edita a jornada.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Salvar regras" })).not.toBeInTheDocument();
  });
});
