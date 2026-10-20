import { expect, type Page } from "@playwright/test";
import { magicLinkFor } from "./mailpit";

/** Pede o link mágico pela tela de Login e devolve a URL que chegou no e-mail. */
export async function requestMagicLink(page: Page, email: string): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Receber link mágico" }).click();
  await expect(page.getByRole("status")).toContainText(`Link mágico enviado para ${email}`);
  return magicLinkFor(email);
}

/** Primeiro acesso: cria a empresa na tela Empresa, com a jornada padrão, e chega na Hoje. */
export async function createCompany(page: Page, name: string) {
  await expect(page).toHaveURL(/\/empresa$/);
  await page.getByLabel("Nome da empresa").fill(name);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Hoje", exact: true })).toBeVisible();
}

/**
 * Abre o sheet manual: o CTA abre a câmera e "Registrar manualmente" cai no registro manual
 * (docs/06). Sem permissão de câmera no Playwright, ela já cai sozinha no manual.
 */
export async function openManualPunch(page: Page, cta: RegExp = /Bater ponto/) {
  await page.getByRole("button", { name: cta }).click();
  const manual = page.getByRole("dialog", { name: /Bater ponto/ });
  const camera = page.getByRole("dialog", { name: "Foto do comprovante" });
  await expect(manual.or(camera)).toBeVisible();
  if (await camera.isVisible()) {
    await camera
      .getByRole("button", { name: "Registrar manualmente" })
      .click({ timeout: 1000 })
      .catch(() => {}); // a câmera pode cair no manual sozinha entre o isVisible e o clique
  }
  await expect(manual).toBeVisible();
}
