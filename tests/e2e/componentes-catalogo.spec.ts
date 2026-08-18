import { expect, test } from "@playwright/test";

test.describe("catálogo de componentes do motor", () => {
  test("lista os 47 componentes centrais, button_tabs e lazy_tabs, e abre o preview", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Componentes" }).click();

    const items = page.locator(".ds-component-item");
    await expect(items).toHaveCount(49);

    await page.getByRole("button", { name: /^button\b/ }).click();
    await expect(page).toHaveURL(/component=core\.button/);
    await expect(page.getByRole("heading", { level: 1, name: "button" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "As quatro variantes, nas cinco cores" })).toBeVisible();
    await expect(page.getByLabel("Dados do componente")).toHaveValue(
      "as-quatro-variantes-nas-cinco-cores",
    );

    await page.getByLabel("Dados do componente").selectOption("os-tres-tamanhos");
    await expect(page).toHaveURL(/component=core\.button&fixture=os-tres-tamanhos/);
    await expect(page.getByRole("heading", { name: "Os três tamanhos" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "As quatro variantes, nas cinco cores" }),
    ).toHaveCount(0);
  });

  test("abre um componente diretamente por link", async ({ page }) => {
    await page.goto("/?component=core.tooltip&fixture=aparece-no-mouse-e-no-foco");

    await expect(page.getByRole("tab", { name: "Componentes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("heading", { level: 1, name: "tooltip" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aparece no mouse e no foco" })).toBeVisible();
  });

  test("a antiga página agregada não faz mais parte do produto", async ({ page }) => {
    await page.goto("/componentes");
    await expect(page.getByRole("heading", { name: "Nenhuma rota para este endereço" })).toBeVisible();
  });
});
