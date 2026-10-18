import { expect, test } from "@playwright/test";
import { createCompany, requestMagicLink } from "./onboarding";

test("cria a empresa no primeiro login e, nos seguintes, entra direto na Hoje", async ({
  page,
}, testInfo) => {
  const email = `ana.lima+${Date.now()}.${testInfo.workerIndex}@example.com`;

  await page.goto(await requestMagicLink(page, email));
  await expect(page.getByRole("heading", { name: "Onde você trabalha?" })).toBeVisible();
  await expect(page.getByLabel("Jornada diária")).toHaveValue("8h00");
  await expect(page.getByText("Tenho um convite")).toHaveCount(0);

  // Sem empresa, o app inteiro leva de volta à tela Empresa.
  await page.goto("/periodo");
  await expect(page).toHaveURL(/\/empresa$/);

  await createCompany(page, "Bananal Ltda");

  // Com empresa, a tela Empresa não aparece mais.
  await page.goto("/empresa");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/ajustes");
  await page.getByRole("button", { name: /Sair/ }).click();
  await expect(page).toHaveURL(/\/login$/);

  // O Auth manda no máximo um link por segundo para o mesmo e-mail (max_frequency em supabase/config.toml).
  await page.waitForTimeout(1_000);
  await page.goto(await requestMagicLink(page, email));
  await expect(page.getByRole("heading", { name: "Hoje", exact: true })).toBeVisible();
});
