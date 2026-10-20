import { type CompanyRules, companyRulesSchema } from "@chimponto/domain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useRef, useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequireSession } from "@/app/guards";
import { type Auth, AuthContext, type AuthState, type SignOutResult } from "@/auth/auth";
import { type Companies, CompaniesContext, type Membership } from "@/company/company";
import { ToastProvider } from "@/components/toast";
import { SettingsScreen } from "./settings";

/** Perfil em memória atrás do cliente Supabase: só as consultas que `@/data/profile` faz. */
const profileRow = vi.hoisted(() => ({ display_name: null as string | null, failUpdate: false }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { display_name: profileRow.display_name },
            error: null,
          }),
        }),
      }),
      update: (row: { display_name: string | null }) => ({
        eq: async () => {
          if (profileRow.failUpdate) return { error: new Error("offline") };
          profileRow.display_name = row.display_name;
          return { error: null };
        },
      }),
    }),
  },
}));

/** `prefers-color-scheme: dark` do aparelho, que o tema "Sistema" segue. */
let systemDark = false;
beforeEach(() => {
  profileRow.display_name = "Marina Costa";
  profileRow.failUpdate = false;
  systemDark = false;
  window.matchMedia = ((query: string) => ({
    matches: query === "(prefers-color-scheme: dark)" && systemDark,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function fakeCompanies(rules: Partial<CompanyRules> = {}): Companies {
  const membership: Membership = {
    companyId: "company-1",
    companyName: "Lumen Software",
    role: "member",
    rules: companyRulesSchema.parse(rules),
  };
  return {
    membershipOf: async () => membership,
    create: async () => "already_member",
    updateRules: async () => "failed",
  };
}

/** Sessão falsa: cada "Sair" usa a próxima resposta; "signed_out" encerra a sessão, como o SDK. */
function FakeAuth({
  signOutResults,
  children,
}: {
  signOutResults: SignOutResult[];
  children: ReactNode;
}) {
  const pending = useRef([...signOutResults]);
  const [state, setState] = useState<AuthState>({
    status: "signed_in",
    user: { id: "user-a", email: "marina@lumen.dev" },
  });
  const auth: Auth = {
    state,
    requestMagicLink: async () => "sent",
    verifyCode: async () => "signed_in",
    signInWithPassword: async () => "signed_in",
    signOut: async () => {
      const result = pending.current.shift() ?? "signed_out";
      if (result === "signed_out") setState({ status: "signed_out", linkError: false });
      return result;
    },
  };
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function renderSettings(
  signOutResults: SignOutResult[] = [],
  companies: Companies = fakeCompanies(),
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <FakeAuth signOutResults={signOutResults}>
        <CompaniesContext.Provider value={companies}>
          <ToastProvider>
            <MemoryRouter initialEntries={["/ajustes"]}>
              <Routes>
                <Route path="/login" element={<h1>Tela de login</h1>} />
                <Route path="/ajustes/empresa" element={<h1>Regras da empresa</h1>} />
                <Route
                  path="/ajustes"
                  element={
                    <RequireSession>
                      <SettingsScreen />
                    </RequireSession>
                  }
                />
              </Routes>
            </MemoryRouter>
          </ToastProvider>
        </CompaniesContext.Provider>
      </FakeAuth>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("<SettingsScreen>", () => {
  it("shows the generic error when signing out fails", async () => {
    const user = renderSettings(["failed"]);

    await user.click(screen.getByRole("button", { name: /Sair/ }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Não deu para sair");
    expect(alert).toHaveTextContent("Confira a conexão e tente de novo em um minuto.");
    expect(
      within(alert).getByRole("img", { name: "Bolota escorregando numa casca de banana" }),
    ).toBeVisible();
  });

  it("tries again from the error state and goes back to Login", async () => {
    const user = renderSettings(["failed", "signed_out"]);

    await user.click(screen.getByRole("button", { name: /Sair/ }));
    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Tela de login" })).toBeVisible();
  });

  it("shows the profile card with name, e-mail and company, and only the v1 groups", async () => {
    renderSettings();

    expect(await screen.findByRole("img", { name: "Marina Costa" })).toHaveTextContent("MC");
    expect(await screen.findByText("marina@lumen.dev · Lumen Software")).toBeVisible();
    for (const group of ["Empresa", "Conta", "Aparência"]) {
      expect(screen.getByRole("heading", { name: group })).toBeVisible();
    }
    for (const future of [
      "Notificações",
      "Cofre",
      "Dados salariais",
      "Feriados",
      "Convidar colegas",
    ]) {
      expect(screen.queryByText(future)).not.toBeInTheDocument();
    }
  });

  it("edits the display name and the avatar follows it", async () => {
    const user = renderSettings();

    await user.click(await screen.findByRole("button", { name: /Marina Costa/ }));
    const input = screen.getByLabelText("Nome de exibição");
    expect(input).toHaveValue("Marina Costa");
    await user.clear(input);
    await user.type(input, "Ana Lima");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("img", { name: "Ana Lima" })).toHaveTextContent("AL");
    expect(screen.queryByLabelText("Nome de exibição")).not.toBeInTheDocument();
  });

  it("an empty display name falls back to the e-mail initials", async () => {
    const user = renderSettings();

    await user.click(await screen.findByRole("button", { name: /Marina Costa/ }));
    await user.clear(screen.getByLabelText("Nome de exibição"));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("img", { name: "marina@lumen.dev" })).toHaveTextContent("M");
  });

  it("keeps the sheet open with a toast when the name can't be saved", async () => {
    profileRow.failUpdate = true;
    const user = renderSettings();

    await user.click(await screen.findByRole("button", { name: /Marina Costa/ }));
    await user.type(screen.getByLabelText("Nome de exibição"), " Silva");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    // O sheet aberto esconde o resto da tela dos leitores de tela; o toast fica fora dele.
    expect(
      await screen.findByText("Não deu para salvar o nome. Tente de novo."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nome de exibição")).toHaveValue("Marina Costa Silva");
  });

  it("summarizes the company rules and opens them", async () => {
    const user = renderSettings(
      [],
      fakeCompanies({
        dailyMinutes: 528,
        workdays: ["mon", "wed", "fri"],
        expectedLunchMinutes: 90,
      }),
    );

    const row = await screen.findByRole("link", { name: /Lumen Software/ });
    expect(row).toHaveTextContent("Jornada 8h48 · seg, qua, sex · almoço 1h30");
    await user.click(row);

    expect(await screen.findByRole("heading", { name: "Regras da empresa" })).toBeVisible();
  });

  it("applies the chosen theme to <html> and remembers it on the device", async () => {
    const user = renderSettings();
    const html = document.documentElement;

    expect(screen.getByRole("radio", { name: "Sistema" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Escuro" }));
    expect(html).toHaveClass("dark");
    expect(localStorage.getItem("chimponto:theme")).toBe("dark");

    await user.click(screen.getByRole("radio", { name: "Claro" }));
    expect(html).not.toHaveClass("dark");

    systemDark = true;
    await user.click(screen.getByRole("radio", { name: "Sistema" }));
    expect(html).toHaveClass("dark");
  });

  it("starts with the theme remembered on the device", () => {
    localStorage.setItem("chimponto:theme", "light");
    renderSettings();

    expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
  });
});
