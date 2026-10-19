import { expect, test } from "@playwright/test";
import { createCompany, requestMagicLink } from "./onboarding";

test("o admin muda a jornada e a Hoje passa a usá-la; o nome de exibição vira o avatar", async ({
  page,
}, testInfo) => {
  const email = `caio.reis+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await page.getByRole("link", { name: "Ajustes" }).click();
  await page.getByRole("link", { name: /Bananal Ltda/ }).click();
  await page.getByLabel("Jornada diária").fill("8h48");
  // Todos os dias de jornada: a Hoje tem jornada em qualquer dia da semana em que o teste rodar.
  await page.getByRole("checkbox", { name: "sáb" }).check();
  await page.getByRole("checkbox", { name: "dom" }).check();
  await page.getByRole("button", { name: "Salvar regras" }).click();
  await expect(page.getByRole("status")).toContainText("Regras da empresa salvas.");
  await expect(page.getByRole("link", { name: /Bananal Ltda/ })).toContainText(
    "Jornada 8h48 · seg a dom · almoço 1h",
  );

  await page.getByRole("button", { name: /caio\.reis/ }).click();
  await page.getByLabel("Nome de exibição").fill("Caio Reis");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("img", { name: "Caio Reis" })).toHaveText("CR");

  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page.getByRole("group", { name: "Trabalhadas" })).toContainText("de 8h48");
  await expect(page.getByRole("img", { name: "Caio Reis" })).toHaveText("CR");
});
