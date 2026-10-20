import { expect, type Page, test } from "@playwright/test";
import { createCompany, openManualPunch, requestMagicLink } from "./onboarding";

// Dia num período já fechado (20/08 → 19/09/2026), como em period.spec.ts: os totais não dependem
// da data de execução.

/** Registra batidas num dia passado pelo sheet "Bater ponto", trocando a data. */
async function punchDay(page: Page, date: string, ...times: string[]) {
  for (const time of times) {
    await openManualPunch(page, /Bater ponto|Dia completo/);
    const sheet = page.getByRole("dialog", { name: "Bater ponto" });
    await sheet.getByLabel("Data").fill(date);
    await sheet.getByLabel("Hora").fill(time);
    await sheet.getByRole("button", { name: "Salvar batida" }).click();
    await expect(sheet).toBeHidden();
  }
}

test("completa um dia incompleto pela tela Dia e vê o período atualizado", async ({
  page,
}, testInfo) => {
  const email = `rui.lopes+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await punchDay(page, "2026-09-17", "09:00", "12:00", "13:00"); // qui, falta a saída

  await page.getByRole("link", { name: /Saldo do período · / }).click();
  const selector = page.getByRole("group", { name: "Período" });
  const previous = selector.getByRole("button", { name: "Período anterior" });
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();

  const row = page.getByRole("listitem", { name: "qui, 17 set" });
  await expect(row).toContainText("3 batidas");
  await row.getByRole("link").click();

  await expect(page.getByRole("heading", { name: "qui, 17 set" })).toBeVisible();
  await expect(page.getByText("Período 20 ago → 19 set")).toBeVisible();
  await expect(page.getByText("Falta uma batida neste dia.")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();

  await page
    .getByRole("group", { name: "Batidas" })
    .getByRole("textbox", { name: "Saída", exact: true })
    .fill("18:20");
  await expect(page.getByRole("group", { name: "Saldo do dia" })).toContainText("+0h20");
  await page.getByRole("button", { name: "Salvar dia" }).click();

  await expect(page.getByRole("status")).toContainText("Dia 17 salvo");
  await expect(selector).toContainText("20 ago → 19 set");
  await expect(row).not.toContainText("3 batidas");
  await expect(row).toContainText("8h20");
  await expect(row).toContainText("+0h20");
  const summary = page.getByRole("region", { name: "Saldo do período" });
  await expect(summary.getByRole("group", { name: "Horas extras" })).toContainText("+0h20");

  // Sobe pela fila: com a fila vazia, o dia volta completo do servidor.
  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page.getByText(/na fila/)).toBeHidden();
  await page.reload();
  await page.getByRole("link", { name: "Período", exact: true }).click();
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();
  await expect(row).toContainText("+0h20");
});

test("marca um dia como atestado e vê o badge e o saldo no período", async ({ page }, testInfo) => {
  const email = `rui.lopes+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await punchDay(page, "2026-09-16", "09:00", "11:00", "12:00", "14:00"); // qua, 4h

  await page.getByRole("link", { name: /Saldo do período · / }).click();
  const selector = page.getByRole("group", { name: "Período" });
  const previous = selector.getByRole("button", { name: "Período anterior" });
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();

  const row = page.getByRole("listitem", { name: "qua, 16 set" });
  await expect(row).toContainText("−4h00");
  await row.getByRole("link").click();

  await page
    .getByRole("group", { name: "Tipo do dia" })
    .getByRole("button", { name: "Atestado" })
    .click();
  await expect(page.getByText("Dia abonado: não conta jornada.")).toBeVisible();
  await expect(page.getByRole("group", { name: "Saldo do dia" })).toContainText("+4h00");
  await page.getByRole("button", { name: "Salvar dia" }).click();

  await expect(page.getByRole("status")).toContainText("Dia 16 salvo");
  await expect(row).toContainText("Atestado");
  await expect(row).toContainText("+4h00");
  const summary = page.getByRole("region", { name: "Saldo do período" });
  await expect(summary.getByRole("group", { name: "Horas extras" })).toContainText("+4h00");

  // Sobe pela fila: com a fila vazia, a marcação volta do servidor.
  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page.getByText(/na fila/)).toBeHidden();
  await page.reload();
  await page.getByRole("link", { name: "Período", exact: true }).click();
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();
  await expect(row).toContainText("Atestado");
  await expect(row).toContainText("+4h00");
});

test("marca um dia útil sem batidas como feriado e ele deixa de ser Sem registro", async ({
  page,
}, testInfo) => {
  const email = `rui.lopes+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await page.getByRole("link", { name: /Saldo do período · / }).click();
  const selector = page.getByRole("group", { name: "Período" });
  const previous = selector.getByRole("button", { name: "Período anterior" });
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();

  const row = page.getByRole("listitem", { name: "seg, 7 set" });
  await expect(row).toContainText("Sem registro");
  await row.getByRole("link").click();

  await page
    .getByRole("group", { name: "Tipo do dia" })
    .getByRole("button", { name: "Feriado" })
    .click();
  await expect(page.getByText("Feriado: não conta jornada.")).toBeVisible();
  await page.getByRole("button", { name: "Salvar dia" }).click();

  await expect(page.getByRole("status")).toContainText("Dia 7 salvo");
  await expect(row).toContainText("Feriado");
  await expect(row).not.toContainText("Sem registro");

  // Sobe pela fila: com a fila vazia, a marcação volta do servidor.
  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page.getByText(/na fila/)).toBeHidden();
  await page.reload();
  await page.getByRole("link", { name: "Período", exact: true }).click();
  while (!(await selector.textContent())?.includes("20 ago → 19 set")) await previous.click();
  await expect(row).toContainText("Feriado");
});
