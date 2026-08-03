import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("galeria — avisos e formulário simples", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/componentes"); });

  test("conta os três portes somente com as demos completas", async ({ page }) => {
    await expect(page.getByText("37 de 47 portados do sistema")).toBeVisible();
    await expect(page.getByRole("heading", { name: "flash", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "flash_group", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "simple_form", exact: true })).toBeVisible();
  });

  test("flash anuncia, recebe foco real por Tab e fecha pelo controle nomeado", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Registrar resultado" });
    await trigger.click();
    const alert = page.locator("#g-flash");
    await expect(alert).toHaveAttribute("id", "g-flash");
    await expect(alert).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(alert.getByRole("button", { name: "Fechar" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(alert).toBeHidden();
  });

  test("flash_group mantém os quatro IDs canônicos e alterna os nós de conexão", async ({ page }) => {
    const group = page.locator("#g-flash-group");
    const infoAlert = group.locator("#flash-info");
    const errorAlert = group.locator("#flash-error");
    await expect(infoAlert).toHaveCount(1);
    await expect(errorAlert).toHaveCount(1);
    const clientAlert = group.locator("#client-error");
    const serverAlert = group.locator("#server-error");
    await expect(clientAlert).toHaveCount(1);
    await expect(serverAlert).toHaveCount(1);
    await infoAlert.getByRole("button", { name: "Fechar" }).press("Enter");
    await expect(infoAlert).toHaveCount(0);
    await expect(errorAlert).toHaveCount(1);
    await errorAlert.getByRole("button", { name: "Fechar" }).press("Enter");
    await expect(errorAlert).toHaveCount(0);
    await expect(clientAlert).toBeHidden();
    await expect(serverAlert).toBeHidden();
    await page.getByRole("button", { name: "Simular internet indisponível" }).click();
    await expect(clientAlert).toBeVisible();
    await expect(clientAlert).toContainText("We can't find the internet");
    await expect(clientAlert).toContainText("Attempting to reconnect");
    await expect(serverAlert).toBeHidden();
    await clientAlert.getByRole("button", { name: "Fechar" }).press("Enter");
    await expect(clientAlert).toBeHidden();
    await expect(serverAlert).toBeHidden();
    await page.getByRole("button", { name: "Simular falha do servidor" }).click();
    await expect(clientAlert).toBeHidden();
    await expect(serverAlert).toBeVisible();
    await expect(serverAlert).toContainText("Something went wrong!");
    await expect(serverAlert).toContainText("Hang in there while we get back on track");
    await serverAlert.getByRole("button", { name: "Fechar" }).press("Enter");
    await expect(clientAlert).toBeHidden();
    await expect(serverAlert).toBeHidden();
  });

  test("simple_form envia habilitado e bloqueia campos e envio quando desabilitado", async ({ page }) => {
    const form = page.locator("#g-simple-form");
    const status = page.getByRole("status").filter({ hasText: /Mudanças/ });
    await expect(form).toHaveAttribute("name", "programa");
    await expect(form).toHaveAttribute("autocomplete", "off");
    await expect(form).toHaveAttribute("data-demo", "simple-form");
    await form.getByLabel("Nome do programa").fill("Imitação motora generalizada");
    await expect(status).toHaveText("Mudanças: 1. Envios: 0.");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(status).toHaveText("Mudanças: 1. Envios: 1.");
    await page.getByRole("button", { name: "Desabilitar formulário" }).click();
    await expect(form.locator("fieldset")).toHaveAttribute("disabled", "");
    await expect(form.getByLabel("Nome do programa")).toBeDisabled();
    await expect(form.getByLabel("Objetivo")).toBeDisabled();
    await expect(form.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await expect(form.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await form.getByLabel("Nome do programa").dispatchEvent("change");
    await form.dispatchEvent("submit");
    await expect(status).toHaveText("Mudanças: 1. Envios: 1.");
    const actions = form.locator("fieldset > div.justify-between");
    await expect(actions).toHaveClass(/justify-between/);
    const boxes = await Promise.all([actions.boundingBox(), form.getByRole("button", { name: "Cancelar" }).boundingBox(), form.getByRole("button", { name: "Salvar" }).boundingBox()]);
    expect(boxes.every(Boolean)).toBe(true);
    expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);
    await expect(page.getByRole("button", { name: "Habilitar formulário" })).toBeVisible();
  });

  test("não introduz violações automáticas nas três demos", async ({ page }) => {
    await page.getByRole("button", { name: "Registrar resultado" }).click();
    await page.getByRole("button", { name: "Simular internet indisponível" }).click();
    const results = await new AxeBuilder({ page })
      .include("#g-flash")
      .include("#g-flash-group")
      .include("#g-simple-form")
      // Contraste é dívida conhecida dos tokens espelhados; este teste protege estrutura e relações ARIA.
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
