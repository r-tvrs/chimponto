import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Auth, AuthContext } from "@/auth/auth";
import { LoginScreen } from "./login";

function renderLogin(overrides: Partial<Auth> = {}) {
  const auth: Auth = {
    state: { status: "signed_out", linkError: false },
    requestMagicLink: vi.fn(async () => "sent" as const),
    signOut: vi.fn(async () => "signed_out" as const),
    ...overrides,
  };
  render(
    <AuthContext.Provider value={auth}>
      <LoginScreen />
    </AuthContext.Provider>,
  );
  return auth;
}

async function askForLink(email: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("E-mail"), email);
  await user.click(screen.getByRole("button", { name: "Receber link mágico" }));
  return user;
}

describe("<LoginScreen>", () => {
  it("sends the magic link and confirms where it went", async () => {
    const auth = renderLogin();

    await askForLink("marina@lumen.dev");

    expect(auth.requestMagicLink).toHaveBeenCalledWith("marina@lumen.dev");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Link mágico enviado para marina@lumen.dev",
    );
  });

  it("blocks a second request while the link is on its way", async () => {
    renderLogin({ requestMagicLink: vi.fn(() => new Promise<never>(() => {})) });

    await askForLink("marina@lumen.dev");

    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
  });

  it("flags an invalid e-mail on the field without asking for a link", async () => {
    const auth = renderLogin();

    await askForLink("marina@");

    expect(auth.requestMagicLink).not.toHaveBeenCalled();
    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription("Digite um e-mail válido.");
    expect(screen.getByLabelText("E-mail")).toBeInvalid();
  });

  it("shows the generic error when the link can't be sent, and retries on demand", async () => {
    const requestMagicLink = vi
      .fn<Auth["requestMagicLink"]>()
      .mockResolvedValueOnce("failed")
      .mockResolvedValueOnce("sent");
    renderLogin({ requestMagicLink });

    const user = await askForLink("marina@lumen.dev");

    expect(await screen.findByRole("alert")).toHaveTextContent("Não deu para enviar o link");
    expect(
      screen.getByRole("img", { name: "Bolota escorregando numa casca de banana" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(requestMagicLink).toHaveBeenCalledTimes(2);
    expect(requestMagicLink).toHaveBeenLastCalledWith("marina@lumen.dev");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Link mágico enviado para marina@lumen.dev",
    );
  });

  it("asks to wait when links were requested too often", async () => {
    renderLogin({ requestMagicLink: vi.fn(async () => "rate_limited" as const) });

    await askForLink("marina@lumen.dev");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Muitos pedidos seguidos");
    expect(within(alert).getByText("Espere um minuto e tente de novo.")).toBeVisible();
  });

  it("explains an expired or used link, then goes back to the form", async () => {
    renderLogin({ state: { status: "signed_out", linkError: true } });

    const alert = screen.getByRole("alert");
    expect(within(alert).getByRole("heading")).toHaveTextContent("Esse link não vale mais");

    await userEvent.click(within(alert).getByRole("button", { name: "Tentar de novo" }));

    expect(screen.getByRole("button", { name: "Receber link mágico" })).toBeVisible();
  });
});
