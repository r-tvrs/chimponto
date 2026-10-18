import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useRef, useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { RequireSession } from "@/app/guards";
import { type Auth, AuthContext, type AuthState, type SignOutResult } from "@/auth/auth";
import { SettingsScreen } from "./settings";

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
    signOut: async () => {
      const result = pending.current.shift() ?? "signed_out";
      if (result === "signed_out") setState({ status: "signed_out", linkError: false });
      return result;
    },
  };
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function renderSettings(...signOutResults: SignOutResult[]) {
  render(
    <FakeAuth signOutResults={signOutResults}>
      <MemoryRouter initialEntries={["/ajustes"]}>
        <Routes>
          <Route path="/login" element={<h1>Tela de login</h1>} />
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
    </FakeAuth>,
  );
  return userEvent.setup();
}

describe("<SettingsScreen>", () => {
  it("shows the generic error when signing out fails", async () => {
    const user = renderSettings("failed");

    await user.click(screen.getByRole("button", { name: /Sair/ }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Não deu para sair");
    expect(alert).toHaveTextContent("Confira a conexão e tente de novo em um minuto.");
    expect(
      within(alert).getByRole("img", { name: "Bolota escorregando numa casca de banana" }),
    ).toBeVisible();
  });

  it("tries again from the error state and goes back to Login", async () => {
    const user = renderSettings("failed", "signed_out");

    await user.click(screen.getByRole("button", { name: /Sair/ }));
    await user.click(await screen.findByRole("button", { name: "Tentar de novo" }));

    expect(await screen.findByRole("heading", { name: "Tela de login" })).toBeVisible();
  });
});
