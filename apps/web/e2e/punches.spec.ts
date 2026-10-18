import { expect, type Page, test } from "@playwright/test";
import { createCompany, requestMagicLink } from "./onboarding";

/** Bate o ponto pelo CTA na hora `time` de hoje e confere o rótulo derivado e o toast. */
async function punchAt(page: Page, time: string, phrase: string, toast: string) {
  await page.getByRole("button", { name: /Bater ponto/ }).click();
  const sheet = page.getByRole("dialog", { name: "Bater ponto" });
  await sheet.getByLabel("Hora").fill(time);
  await expect(sheet).toContainText(`Vai entrar como ${phrase}`);
  await sheet.getByRole("button", { name: "Salvar batida" }).click();
  await expect(page.getByRole("status")).toContainText(toast);
  await expect(sheet).toBeHidden();
}

const punchRows = (page: Page) => page.getByRole("region", { name: "Batidas" }).getByRole("button");

test("registra 4 batidas fora de ordem, com os rótulos pela ordem do dia, e recusa o mesmo minuto", async ({
  page,
}, testInfo) => {
  const email = `bia.souza+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await punchAt(page, "09:00", "entrada", "Bom dia! Entrada às 09:00.");
  // Só entrada e saída, com mais de 6h: o almoço é lançado depois.
  await punchAt(page, "18:00", "saída", "Até amanhã! Saída às 18:00.");
  await punchAt(page, "12:00", "saída para o almoço", "Bom almoço! Saída às 12:00.");

  await page.getByRole("button", { name: /Bater ponto/ }).click();
  const sheet = page.getByRole("dialog", { name: "Bater ponto" });
  await sheet.getByLabel("Hora").fill("12:00");
  await expect(sheet.getByRole("alert")).toHaveText("Já tem uma batida às 12:00.");
  await expect(sheet.getByRole("button", { name: "Salvar batida" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  await punchAt(page, "13:00", "volta do almoço", "De volta ao galho! Volta às 13:00.");

  await page.reload();
  const expected = [
    "Editar Entrada, 09:00",
    "Editar Saída almoço, 12:00",
    "Editar Volta almoço, 13:00",
    "Editar Saída, 18:00",
  ];
  await expect(punchRows(page)).toHaveCount(expected.length);
  for (const [i, name] of expected.entries()) {
    await expect(punchRows(page).nth(i)).toHaveAccessibleName(name);
  }
  await expect(page.getByRole("region", { name: "Batidas" }).getByText("4 de 4")).toBeVisible();
});

test("fecha o dia nas 4 batidas, com o saldo do dia", async ({ page }, testInfo) => {
  const email = `caio.lima+${Date.now()}.${testInfo.workerIndex}@example.com`;
  await page.goto(await requestMagicLink(page, email));
  await createCompany(page, "Bananal Ltda");

  await punchAt(page, "09:03", "entrada", "Bom dia! Entrada às 09:03.");
  await punchAt(page, "13:00", "saída para o almoço", "Bom almoço! Saída às 13:00.");
  await punchAt(page, "14:05", "volta do almoço", "De volta ao galho! Volta às 14:05.");
  await punchAt(page, "18:30", "saída", "Até amanhã! Saída às 18:30.");

  // 8h22 trabalhadas: +0h22 num dia de jornada (seg–sex, 8h); fim de semana conta tudo.
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  }).format(new Date());
  const balance = ["Sat", "Sun"].includes(weekday) ? "+8h22" : "+0h22";

  const closed = page.getByRole("region", { name: "Dia fechado" });
  await expect(closed.getByRole("heading")).toHaveText(`Saldo do dia ${balance}`);
  await expect(page.getByRole("group", { name: "Saldo do dia" })).toContainText(balance);
  const complete = page.getByRole("button", { name: /Dia completo · 4 de 4 batidas/ });
  await expect(complete).toBeEnabled();
  await expect(complete).toContainText("registrar nova batida");
});
