import { expect, test } from "@playwright/test";

test("app abre com título e ação principal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Chimponto");
  await expect(page.getByRole("button", { name: /bater ponto/i })).toBeVisible();
  await expect(page.getByLabel("mais 1 hora e 20 minutos")).toHaveText("+1h20");
});
