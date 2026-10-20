import { expect, test } from "@playwright/test";
import { loginCodeFor } from "./mailpit";
import { createCompany, requestMagicLink } from "./onboarding";

test("entra por link mágico, mantém a sessão, navega pelas abas e sai", async ({
  page,
  context,
}, testInfo) => {
  // Só letras antes do "+": as iniciais do avatar ficam "MC".
  const email = `marina.costa+${Date.now()}.${testInfo.workerIndex}@example.com`;

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle("Chimponto");

  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Lumen Software");
  await expect(page.getByRole("img", { name: email })).toHaveText("MC");

  // Reabrir o app: página nova no mesmo navegador, sem passar pelo login.
  await page.close();
  const app = await context.newPage();
  await app.goto("/");
  await expect(app.getByRole("heading", { name: "Hoje", exact: true })).toBeVisible();
  await app.goto("/login");
  await expect(app).toHaveURL(/\/$/);
  await app.goto("/rota-que-nao-existe");
  await expect(app).toHaveURL(/\/$/);

  const tabs = app.getByRole("navigation", { name: "Principal" });
  await expect(tabs.getByRole("link")).toHaveText(["Hoje", "Período", "Salário", "Ajustes"]);
  await expect(tabs.getByRole("link", { name: "Hoje" })).toHaveAttribute("aria-current", "page");

  await tabs.getByRole("link", { name: "Período" }).click();
  await expect(app.getByRole("heading", { name: "Período", exact: true })).toBeVisible();

  await tabs.getByRole("link", { name: "Salário" }).click();
  await expect(tabs.getByRole("link", { name: "Salário" })).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: "Hoje" })).not.toHaveAttribute("aria-current");
  await expect(app.getByText("Em breve")).toBeVisible();

  await tabs.getByRole("link", { name: "Ajustes" }).click();
  await app.getByRole("button", { name: /Sair/ }).click();
  await expect(app).toHaveURL(/\/login$/);

  await app.goto("/ajustes");
  await expect(app).toHaveURL(/\/login$/);
});

test("link mágico já usado mostra o erro e volta ao login", async ({ page }, testInfo) => {
  const email = `link.usado+${Date.now()}.${testInfo.workerIndex}@example.com`;

  const link = await requestMagicLink(page, email);
  await page.goto(link);
  await createCompany(page, "Lumen Software");
  await page.goto("/ajustes");
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto(link);
  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading")).toHaveText("Esse link não vale mais");
  await alert.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page.getByRole("button", { name: "Receber link mágico" })).toBeVisible();
});

test("entra pelo código do e-mail, sem sair do app", async ({ page }, testInfo) => {
  const email = `codigo+${Date.now()}.${testInfo.workerIndex}@example.com`;

  // Pede o e-mail e não abre o link: lê só o código.
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Receber link mágico" }).click();
  const code = await loginCodeFor(email);

  const field = page.getByLabel("Código do e-mail");
  await field.fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(field).toHaveAccessibleDescription(
    "Código errado ou expirado. Confira ou peça outro.",
  );

  await field.fill(code);
  await page.getByRole("button", { name: "Entrar" }).click();
  await createCompany(page, "Lumen Software");
});
