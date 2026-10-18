import { expect, type Page, test } from "@playwright/test";
import { createCompany, requestMagicLink } from "./onboarding";

// As batidas sintéticas ficam no período 20/08 → 19/09/2026, já fechado em qualquer data de
// execução; assim os totais não dependem do dia. (O `page.clock` do Playwright quebra o
// `Intl.DateTimeFormat.formatToParts` do app, por isso o relógio fica o real.)

/** Registra batidas num dia passado pelo sheet "Bater ponto", trocando a data. */
async function punchDay(page: Page, date: string, ...times: string[]) {
  for (const time of times) {
    await page.getByRole("button", { name: /Bater ponto|Dia completo/ }).click();
    const sheet = page.getByRole("dialog", { name: "Bater ponto" });
    await sheet.getByLabel("Data").fill(date);
    await sheet.getByLabel("Hora").fill(time);
    await sheet.getByRole("button", { name: "Salvar batida" }).click();
    await expect(sheet).toBeHidden();
  }
}

const days = (page: Page) =>
  page.getByRole("list", { name: "Dias do período" }).getByRole("listitem");

test("mostra o resumo do período, filtra as pendências e navega entre períodos", async ({
  page,
}, testInfo) => {
  const email = `dani.rocha+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await punchDay(page, "2026-09-15", "09:00", "12:00", "13:00", "18:40"); // ter, +0h40
  await punchDay(page, "2026-09-16", "09:00", "12:00", "13:00", "17:03"); // qua, −0h57
  await punchDay(page, "2026-09-17", "09:00", "12:00", "13:00"); // qui, falta a saída

  await page.getByRole("link", { name: /Saldo do período · / }).click();

  const selector = page.getByRole("group", { name: "Período" });
  await expect(selector).toContainText(/período atual · fecha (hoje|amanhã|em \d+ dias)/);
  await expect(selector.getByRole("button", { name: "Próximo período" })).toBeDisabled();

  const previous = selector.getByRole("button", { name: "Período anterior" });
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();
  await expect(selector).toContainText("período fechado · pagamento em 1º out");

  const summary = page.getByRole("region", { name: "Saldo do período" });
  await expect(summary.getByLabel("menos 0 horas e 17 minutos")).toHaveText("−0h17");
  await expect(summary.getByRole("group", { name: "Horas extras" })).toContainText("+0h40");
  await expect(summary.getByRole("group", { name: "Débito" })).toContainText("−0h57");
  // 22 dias úteis: 19 sem registro e o 17/09 incompleto.
  await expect(summary.getByRole("group", { name: "Pendências" })).toContainText("20");

  await expect(days(page)).toHaveCount(31);
  await expect(page.getByRole("listitem", { name: "ter, 15 set" })).toContainText("+0h40");
  await expect(page.getByRole("listitem", { name: "qui, 17 set" })).toContainText("3 batidas");
  await expect(page.getByRole("listitem", { name: "sex, 18 set" })).toContainText("Sem registro");

  await page.getByRole("tab", { name: "Pendências (20)" }).click();
  await expect(days(page)).toHaveCount(20);
  await expect(days(page).first()).toHaveAccessibleName("sex, 18 set");

  await previous.click();
  await expect(selector).toContainText("20 jul → 19 ago");
  await expect(summary.getByLabel("0 horas e 0 minutos").first()).toHaveText("±0h00");
  // Nenhuma batida: os 23 dias úteis de 20/07 a 19/08 sem registro.
  await expect(page.getByRole("tab", { name: "Pendências (23)" })).toBeVisible();

  await selector.getByRole("button", { name: "Próximo período" }).click();
  await expect(selector).toContainText("20 ago → 19 set");
  await expect(summary).toContainText("−0h17");
});
