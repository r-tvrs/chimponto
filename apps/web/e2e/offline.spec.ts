import { expect, test } from "@playwright/test";
import { createCompany, requestMagicLink } from "./onboarding";

test("bate o ponto sem sinal, guarda na fila e sobe quando a conexão volta", async ({
  page,
  context,
}, testInfo) => {
  const email = `davi.rocha+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await context.setOffline(true);
  await expect(page.getByRole("region", { name: "Sem sinal na selva" })).toBeVisible();

  await page.getByRole("button", { name: /Bater ponto/ }).click();
  const sheet = page.getByRole("dialog", { name: "Bater ponto" });
  await sheet.getByLabel("Hora").fill("09:00");
  await sheet.getByRole("button", { name: "Salvar batida" }).click();

  await expect(page.getByRole("status")).toContainText(
    "Salvo no aparelho. Sobe quando o sinal voltar.",
  );
  await expect(page.getByText("Offline · 1 na fila")).toBeVisible();
  const batidas = page.getByRole("region", { name: "Batidas" });
  await expect(batidas.getByRole("button", { name: "Editar Entrada, 09:00" })).toBeVisible();

  await context.setOffline(false);

  await expect(page.getByText(/na fila/)).toBeHidden();
  await expect(page.getByRole("region", { name: "Sem sinal na selva" })).toBeHidden();

  // Sem a fila no aparelho, a batida só pode vir do servidor.
  // Em string: o tsconfig do Playwright não tem os tipos do DOM.
  await page.evaluate(`new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("chimponto");
    request.onsuccess = resolve;
    request.onerror = reject;
  })`);
  await page.reload();
  await expect(batidas.getByRole("button", { name: "Editar Entrada, 09:00" })).toBeVisible();
});
