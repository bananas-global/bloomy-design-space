import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("catálogo — drawer_modal, modal_content e simple_table", () => {
  test("drawer preserva contrato, prende foco e cancela por Escape, fundo e botão", async ({ page }) => {
    await page.goto("/?component=core.drawer-modal");
    const trigger = page.locator("#g-drawer-trigger");
    await trigger.click();
    const drawer = page.locator("#g-drawer");
    const dialog = drawer.getByRole("dialog");
    await expect(drawer).toHaveAttribute("data-placement", "right");
    await expect(drawer).toHaveAttribute("data-trigger-show", "show-drawer");
    await expect(drawer).toHaveAttribute("phx-target", "#g-drawer-owner");
    await expect(drawer).toHaveAttribute("data-demo", "drawer-modal");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby", "g-drawer-title");
    await expect(dialog).toHaveAttribute("aria-describedby", "g-drawer-description");
    await expect(drawer.locator("#g-drawer-container")).toHaveClass(/max-w-3xl/);
    await expect(drawer.locator("#g-drawer-container")).toHaveClass(/translate-x-0/);
    await expect(drawer.locator("#g-drawer-container")).toHaveClass(/duration-300/);
    await expect(drawer.locator("#g-drawer-content")).toHaveClass(/demo-drawer-content/);
    await expect(page.locator("body")).toHaveClass(/overflow-hidden/);
    const close = drawer.locator("#g-drawer-btn-close");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(drawer.locator("#g-drawer-confirm")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    const reason = drawer.locator("#g-drawer-reason");
    await expect(reason).toBeFocused();
    await reason.pressSequentially("Agenda duplicada");
    await expect(reason).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body")).not.toHaveClass(/overflow-hidden/);
    await trigger.press("Enter");
    await drawer.locator("#g-drawer-bg").click({ position: { x: 8, y: 8 } });
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await drawer.getByRole("button", { name: "Fechar" }).press("Enter");
    await expect(drawer.locator("#g-drawer-container")).toHaveClass(/translate-x-full/);
    await expect(drawer.locator("#g-drawer-container")).toHaveClass(/duration-200/);
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("modal_content mantém divisões, slots e retorno da tela e do diálogo", async ({ page }) => {
    await page.goto("/?component=core.modal-content");
    const trigger = page.locator("#g-modal-content-trigger");
    await trigger.click();
    const modal = page.locator("#g-modal-content-modal");
    const content = page.locator("#g-modal-content");
    await expect(modal.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    await expect(content).toHaveAttribute("data-demo", "modal-content");
    await expect(content).toHaveClass(/rounded-2xl/);
    await expect(content.locator(".demo-modal-body")).toContainText("Horas planejadas");
    await expect(modal.getByRole("button", { name: "Fechar" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(content.locator("#g-modal-content-action")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(modal.getByRole("button", { name: "Fechar" })).toBeFocused();
    await content.getByRole("button", { name: "Voltar" }).press("Enter");
    await expect(content).toHaveCount(0);
    await expect(modal.getByText("Tela principal do mapa de horas.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
    await modal.locator("#g-modal-content-modal-bg").click({ position: { x: 8, y: 8 } });
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("simple_table preserva invólucro, slot livre e marcação manual", async ({ page }) => {
    await page.goto("/?component=core.simple-table");
    const wrapper = page.locator('[data-demo="simple-table"]');
    const table = wrapper.getByRole("table");
    await expect(table.locator("..")).toHaveClass(/demo-simple-table/);
    await expect(table.getByRole("columnheader")).toHaveText(["Data", "Horas planejadas", "Horas disponíveis"]);
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(page.locator("#g-hours-31")).toContainText("8 h");
    await expect(page.locator("#g-hours-32")).toContainText("7 h");
    await expect(page.locator("#g-hours-31 .date-cell")).toHaveText("04/08/2026");
    await expect(wrapper.getByText("Nenhum período", { exact: true })).toHaveCount(0);
  });

  test("não introduz violações estruturais nas três demos", async ({ page }) => {
    await page.goto("/?component=core.drawer-modal");
    await page.locator("#g-drawer-trigger").click();
    let results = await new AxeBuilder({ page }).include("#g-drawer").disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await page.goto("/?component=core.modal-content");
    await page.locator("#g-modal-content-trigger").click();
    results = await new AxeBuilder({ page }).include("#g-modal-content-modal").disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await page.goto("/?component=core.simple-table");
    results = await new AxeBuilder({ page }).include('[data-demo="simple-table"]').disableRules(["color-contrast"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
